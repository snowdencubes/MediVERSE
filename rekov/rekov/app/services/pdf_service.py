import os
from fpdf import FPDF
from app.schemas.kiosk_schemas import QueueTicket

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
USER_DIR = os.path.join(DATA_DIR, "receipts_user")
OUR_DIR = os.path.join(DATA_DIR, "receiptsour")

os.makedirs(USER_DIR, exist_ok=True)
os.makedirs(OUR_DIR, exist_ok=True)

def _generate_pdf(ticket: QueueTicket, title: str, filepath: str):
    pdf = FPDF()
    pdf.add_page()
    
    # Header
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, title, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "MediVERSE Hospital Kiosk", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)
    
    # Body
    pdf.set_font("helvetica", size=12)
    pdf.cell(0, 10, f"Ticket ID: {ticket.ticket_id}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Token: {ticket.token_number}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Patient Name: {ticket.patient_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Department: {ticket.department_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Doctor: {ticket.doctor_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Room: {ticket.room_number}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Total Fee: Rs. {ticket.total_fee:.2f}", new_x="LMARGIN", new_y="NEXT")
    
    if ticket.combos_selected:
        pdf.cell(0, 10, f"Packages: {', '.join(ticket.combos_selected)}", new_x="LMARGIN", new_y="NEXT")
        
    pdf.ln(10)
    pdf.set_font("helvetica", "I", 10)
    pdf.cell(0, 10, f"Generated at: {ticket.created_at}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, "Please wait for your token to be called.", new_x="LMARGIN", new_y="NEXT")
    
    pdf.output(filepath)

def generate_receipts(ticket: QueueTicket) -> tuple[str, str]:
    """Generates two receipts and returns their filepaths: (user_path, our_path)"""
    user_path = os.path.join(USER_DIR, f"{ticket.ticket_id}_user.pdf")
    our_path = os.path.join(OUR_DIR, f"{ticket.ticket_id}_our.pdf")
    
    _generate_pdf(ticket, "Patient Receipt", user_path)
    _generate_pdf(ticket, "Hospital Payment Copy", our_path)
    
    return user_path, our_path
