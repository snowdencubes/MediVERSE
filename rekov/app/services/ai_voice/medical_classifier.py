"""
medical_classifier.py - HuggingFace zero-shot medical classifier for hospital kiosk.
Handles English, Hindi, Hinglish, slang (e.g. 'naali me girgya madadad chahiye').
Primary: facebook/bart-large-mnli (zero-shot)
Fallback: keyword dict (offline, 100% reliable)
"""

import os
import re
import json
import requests
from typing import Optional

def _get_hf_token() -> str:
    try:
        from app.core.config import settings
        return (
            settings.CONFIG.get("hf_token")
            or settings.CONFIG.get("HF_TOKEN")
            or getattr(settings, "HF_TOKEN", "")
            or os.getenv("HF_TOKEN", "")
            or os.getenv("HF_API_TOKEN", "")
        )
    except Exception:
        return os.getenv("HF_TOKEN", "") or os.getenv("HF_API_TOKEN", "")

DEPT_LABELS = [
    "Emergency", "Cardiology", "Orthopedics", "Pediatrics",
    "Neurology", "Dermatology", "ENT", "Gastroenterology",
    "General Medicine", "Pharmacy"
]
INTENT_LABELS = [
    "book appointment", "confirm booking", "cancel or deny",
    "ask question", "emergency help", "greeting", "unrelated or off-topic"
]

LANG_HI = ["mujhe","mera","mere","hai","hain","ho","chahiye","dard","bukhar","khoon","pet",
           "seena","naak","kaan","hath","pair","peeth","khansi","naali","girgya","gir",
           "gaya","madad","takleef","bechaini","kamzori","chakkar","ulta"]
LANG_HINGLISH = ["mujhe","doctor","help","please","problem","feeling","pain","booking",
                 "appointment","token","book","chahiye","karo","gaya","bahut","nahi","haan","bilkul"]

DEPT_KW = {
    "Emergency": ["emergency","accident","unconscious","bleeding","girgya","gir gaya","naali","nala",
                  "fell","faint","collapsed","stroke","fit","behosh","beshosh","madadad",
                  "help me","madad chahiye","urgent","serious","critical","dying","khoon aa raha",
                  "bachao","saans nahi","heart attack","not breathing"],
    "Cardiology": ["chest","heart","cardiac","seena","dil","dhadkan","bp","blood pressure",
                   "breathless","saans","palpitation","ecg","cholesterol"],
    "Orthopedics": ["bone","fracture","joint","knee","back","spine","ghutna","peeth",
                    "kamar","toot","sprain","slip disc","ankle","wrist"],
    "Pediatrics": ["child","baby","bacha","baccha","infant","newborn","paediatric","toddler"],
    "Neurology": ["headache","migraine","sir dard","brain","memory","epilepsy",
                  "seizure","dizziness","chakkar","numbness","nerve","paralysis"],
    "Dermatology": ["skin","rash","itching","khujli","allergy","eczema","acne",
                    "pimple","wound","infection","fungal"],
    "ENT": ["ear","nose","throat","kaan","naak","gala","sore throat","sinusitis",
            "tonsil","hearing","nasal"],
    "Gastroenterology": ["stomach","pet dard","diarrhea","vomit","ulta","loose motion",
                         "acidity","gas","constipation","liver","hepatitis","abdomen"],
    "General Medicine": ["fever","bukhar","cold","cough","flu","viral","weakness",
                         "kamzori","thakaan","fatigue","general","checkup","routine"],
    "Pharmacy": ["medicine","dawa","prescription","tablet","syrup","pharmacy","refill","pills"]
}
EMG_KW = ["emergency","accident","unconscious","faint","collapsed","behosh","beshosh",
          "stroke","fit","seize","bleeding","khoon aa raha","girgya","gir gaya","naali",
          "nala","fell","fall down","not breathing","saans nahi","chest pain","heart attack",
          "dying","madadad","bachao","save me","girgaya","gira","madad chahiye"]
CONFIRM_W = ["yes","haan","ha","sure","ok","okay","bilkul","zaroor","theek","proceed","karo","confirm"]
DENY_W = ["no","nahi","nahin","na","cancel","nope","mat karo","ruko","back","wapas","chhod"]

HINDI_EN = {
    "naali me girgya":"fell into a drain need help",
    "naali mein gira":"fell into a drain need help",
    "naali me gir gaya":"fell into a drain need help",
    "naali mein gir gaya":"fell into a drain need help",
    "gir gaya":"fell down accident","girgya":"fell down accident","girgaya":"fell down",
    "madadad":"need help emergency","madad chahiye":"need help",
    "bachao":"save me emergency","behosh":"unconscious fainted","beshosh":"unconscious fainted",
    "dard":"pain","bahut dard":"severe pain","bukhar":"fever","khansi":"cough",
    "seena dard":"chest pain","sir dard":"headache","pet dard":"stomach pain",
    "kamar dard":"back pain","ghutna dard":"knee pain","chakkar":"dizziness",
    "ulta":"vomiting nausea","kamzori":"weakness fatigue","takleef":"discomfort",
    "bechaini":"restlessness","dil":"heart","seena":"chest","sir":"head",
    "pet":"stomach abdomen","peeth":"back","kamar":"lower back","ghutna":"knee",
    "haath":"hand arm","pair":"leg foot","kaan":"ear","naak":"nose",
    "gala":"throat","aankhein":"eyes","haan":"yes","nahi":"no",
    "theek":"okay","zaroor":"definitely yes","bilkul":"absolutely yes",
}

def _detect_lang(text:str)->str:
    lower=text.lower()
    hi=sum(1 for k in LANG_HI if k in lower)
    hg=sum(1 for k in LANG_HINGLISH if k in lower)
    en=sum(1 for k in ["the","is","are","was","have","has","my","i","me","pain"] if k in lower.split())
    if hi>=2: return "hi" if hi>en else "hinglish"
    if hg>=2: return "hinglish"
    return "en"

def _transliterate(text:str)->str:
    r=text.lower()
    for h,e in HINDI_EN.items(): r=r.replace(h,e)
    return r

def _keyword_classify(text:str)->dict:
    lower=text.lower()
    words=lower.split()
    if any(w in words for w in CONFIRM_W) and len(words)<=5:
        return{"intent":"CONFIRM","department":"General Medicine","urgency":"LOW","is_emergency":False,"lang":_detect_lang(text),"confidence":0.9,"source":"keyword"}
    if any(w in words for w in DENY_W) and len(words)<=4:
        return{"intent":"DENY","department":"General Medicine","urgency":"LOW","is_emergency":False,"lang":_detect_lang(text),"confidence":0.9,"source":"keyword"}
    is_emg=any(kw in lower for kw in EMG_KW)
    scores={d:sum(1 for kw in kws if kw in lower) for d,kws in DEPT_KW.items()}
    dept="Emergency" if is_emg else (max(scores,key=lambda d:scores[d]) if any(v>0 for v in scores.values()) else "General Medicine")
    return{"intent":"MEDICAL","department":dept,"urgency":"HIGH" if is_emg else("MEDIUM" if dept!="General Medicine" else "LOW"),"is_emergency":is_emg,"lang":_detect_lang(text),"confidence":0.65,"source":"keyword"}

def _hf_zero_shot(text:str,hf_token:str)->Optional[dict]:
    URL="https://api-inference.huggingface.co/models/facebook/bart-large-mnli"
    H={"Authorization":f"Bearer {hf_token}","Content-Type":"application/json"}
    r=requests.post(URL,headers=H,json={"inputs":text,"parameters":{"candidate_labels":DEPT_LABELS,"multi_label":False}},timeout=8)
    if r.status_code!=200:
        print(f"[CLASSIFIER] HF bart HTTP {r.status_code}: {r.text[:120]}"); return None
    d=r.json()
    if "labels" not in d: return None
    top_dept=d["labels"][0]; top_score=d["scores"][0]
    r2=requests.post(URL,headers=H,json={"inputs":text,"parameters":{"candidate_labels":INTENT_LABELS,"multi_label":False}},timeout=8)
    intent_label="book appointment"
    if r2.status_code==200:
        d2=r2.json()
        if "labels" in d2: intent_label=d2["labels"][0]
    intent_map={"book appointment":"MEDICAL","confirm booking":"CONFIRM","cancel or deny":"DENY",
                "ask question":"QUERY","emergency help":"MEDICAL","greeting":"QUERY","unrelated or off-topic":"OFF_TOPIC"}
    intent=intent_map.get(intent_label,"MEDICAL")
    is_emg=(top_dept=="Emergency") or (intent_label=="emergency help")
    return{"intent":intent,"department":top_dept,"urgency":"HIGH" if is_emg else("MEDIUM" if top_score>0.5 else "LOW"),"is_emergency":is_emg,"confidence":float(top_score),"source":"hf_zero_shot"}

def classify(text:str, hf_token:Optional[str]=None)->dict:
    """Classify any patient utterance. Returns intent, department, urgency, is_emergency, lang, confidence, source."""
    if not text or not text.strip():
        return{"intent":"QUERY","department":"General Medicine","urgency":"LOW","is_emergency":False,"lang":"en","confidence":0.5,"source":"empty"}
    hf_token=hf_token or _get_hf_token()
    lang=_detect_lang(text)
    lower=text.lower()
    # Fast emergency path
    if any(kw in lower for kw in EMG_KW):
        print(f"[CLASSIFIER] EMERGENCY fast-path: {text[:60]}")
        return{"intent":"MEDICAL","department":"Emergency","urgency":"HIGH","is_emergency":True,"lang":lang,"confidence":0.95,"source":"emergency_fastpath"}
    # Fast confirm/deny
    words=lower.split()
    if any(w in words for w in CONFIRM_W) and len(words)<=5:
        return{"intent":"CONFIRM","department":"General Medicine","urgency":"LOW","is_emergency":False,"lang":lang,"confidence":0.9,"source":"keyword"}
    if any(w in words for w in DENY_W) and len(words)<=4:
        return{"intent":"DENY","department":"General Medicine","urgency":"LOW","is_emergency":False,"lang":lang,"confidence":0.9,"source":"keyword"}
    # HF zero-shot
    if hf_token:
        try:
            translated=_transliterate(text)
            result=_hf_zero_shot(translated,hf_token)
            if result:
                result["lang"]=lang
                print(f"[CLASSIFIER] HF OK intent={result['intent']} dept={result['department']} emg={result['is_emergency']} conf={result['confidence']:.2f}")
                return result
        except Exception as e:
            print(f"[CLASSIFIER] HF error: {e}")
    # Keyword fallback
    result=_keyword_classify(text)
    print(f"[CLASSIFIER] Keyword intent={result['intent']} dept={result['department']} emg={result['is_emergency']}")
    return result
