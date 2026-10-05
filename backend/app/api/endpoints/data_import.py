from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.orm import Session
import pandas as pd
import io
import json
from datetime import datetime
from app.core.database import get_db
from app.models.domain import Transaction, Business

router = APIRouter()

@router.post("/preview")
async def preview_data_file(file: UploadFile = File(...)):
    contents = await file.read()
    filename = file.filename.lower()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or Excel.")

        columns = df.columns.tolist()
        sample_rows = df.head(5).fillna("").to_dict(orient="records")
        total_rows = len(df)

        return {
            "filename": file.filename,
            "columns": columns,
            "total_rows": total_rows,
            "preview": sample_rows
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

@router.post("/process")
async def process_and_import_data(
    file: UploadFile = File(...),
    column_mapping: str = Form(...),  # JSON string mapping system field -> CSV column
    business_id: str = None,
    db: Session = Depends(get_db)
):
    if not business_id:
        biz = db.query(Business).first()
        business_id = biz.id if biz else None

    try:
        mapping = json.loads(column_mapping)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON column mapping provided.")

    contents = await file.read()
    filename = file.filename.lower()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or Excel.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

    if df.empty:
        return {
            "status": "Failed",
            "total_rows": 0,
            "imported_count": 0,
            "duplicates_skipped": 0,
            "error_count": 0,
            "errors": ["File contains no data rows."]
        }

    # Reverse mapping for DataFrame rename
    inv_map = {v: k for k, v in mapping.items() if v}
    df.rename(columns=inv_map, inplace=True)

    # Validation Engine
    errors = []
    valid_records = []
    duplicate_count = 0

    for idx, row in df.iterrows():
        row_num = idx + 2
        
        # Required fields check
        if 'date' not in row or pd.isnull(row['date']):
            errors.append(f"Row {row_num}: Missing date field.")
            continue
        if 'amount' not in row or pd.isnull(row['amount']):
            errors.append(f"Row {row_num}: Missing amount field.")
            continue

        # Parse date
        try:
            parsed_date = pd.to_datetime(row['date']).date()
        except Exception:
            errors.append(f"Row {row_num}: Invalid date format '{row['date']}'.")
            continue

        # Parse amount
        try:
            amt = float(str(row['amount']).replace("₹", "").replace(",", "").strip())
        except Exception:
            errors.append(f"Row {row_num}: Invalid numerical amount '{row['amount']}'.")
            continue

        if amt == 0:
            errors.append(f"Row {row_num}: Amount cannot be zero.")
            continue

        tx_type = str(row.get('type', 'Expense')).capitalize()
        if tx_type not in ['Income', 'Expense']:
            tx_type = 'Expense'

        desc = str(row.get('description', 'Imported Transaction'))
        cat = str(row.get('category', 'Other'))

        # Check duplicate
        exists = db.query(Transaction).filter(
            Transaction.business_id == business_id,
            Transaction.date == parsed_date,
            Transaction.amount == amt,
            Transaction.description == desc
        ).first()

        if exists:
            duplicate_count += 1
            continue

        valid_records.append(Transaction(
            business_id=business_id,
            date=parsed_date,
            description=desc,
            type=tx_type,
            category=cat,
            amount=amt,
            payment_method=str(row.get('payment_method', 'Bank Transfer')),
            department=str(row.get('department', 'General')),
            vendor_customer=str(row.get('vendor_customer', '')),
            status='Completed'
        ))

    # Commit valid records
    if valid_records:
        db.add_all(valid_records)
        db.commit()

    return {
        "status": "Success" if valid_records or duplicate_count else "Failed",
        "total_rows": len(df),
        "imported_count": len(valid_records),
        "duplicates_skipped": duplicate_count,
        "error_count": len(errors),
        "errors": errors[:10]  # Return top 10 errors
    }
