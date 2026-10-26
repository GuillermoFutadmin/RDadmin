import json
import uuid


def load_data(value):
    data = json.loads(value or "{}")
    if not isinstance(data, dict):
        raise ValueError("Los datos del proyecto no son válidos")
    return data


def sheets_for(data, project_type):
    if data.get("sheets"):
        return data["sheets"]
    if any(key in data for key in ("materials", "labor", "concepts")):
        return [{"type": data.get("projectType") or project_type,
                 **{key: data.get(key, []) for key in ("materials", "labor", "concepts")}}]
    return []


def ensure_sheet_ids(sheets, state):
    changed = False
    seen = set()
    for sheet in sheets:
        sheet_id = sheet.get("work_id")
        if not isinstance(sheet_id, str) or not sheet_id or sheet_id in seen:
            sheet_id = uuid.uuid4().hex
            sheet["work_id"] = sheet_id
            changed = True
        seen.add(sheet_id)

    sheet_ids = [sheet["work_id"] for sheet in sheets]
    previous_ids = state.get("sheet_ids", [])
    if previous_ids and sheet_ids[:len(previous_ids)] != previous_ids:
        raise ValueError("Los trabajos cambiaron de orden; revisa la valoración antes de continuar")
    state["sheet_ids"] = sheet_ids
    return changed


def sheet_price(sheet, margin):
    return sum(float(row.get("qty") or 0) * float(row.get("price") or 0)
               for key in ("materials", "labor", "concepts") for row in sheet.get(key, [])) * (1 + margin / 100)


def validate_ids(ids, sheets, state, allowed=("ACTIVE",)):
    valid = {f"work-{index + 1}" for index in range(len(sheets))}
    if not ids or len(ids) != len(set(ids)) or any(
        item not in valid or state.get("items", {}).get(item, {}).get("status", "ACTIVE") not in allowed
        for item in ids
    ):
        raise ValueError("Selecciona trabajos disponibles, sin duplicados")


def quote_selection(raw, project_type, ids, state):
    sheets = sheets_for(raw, project_type)
    validate_ids(ids, sheets, state)
    margin = float(raw.get("globalMargin", raw.get("margin", 30)))
    return sum(sheet_price(sheet, margin) for index, sheet in enumerate(sheets) if f"work-{index + 1}" in ids)


def selected_data(raw, project_type, ids):
    sheets = [sheet for index, sheet in enumerate(sheets_for(raw, project_type)) if f"work-{index + 1}" in ids]
    margin = float(raw.get("globalMargin", raw.get("margin", 30)))
    total = sum(sheet_price(sheet, margin) for sheet in sheets)
    return {**raw, "sheets": sheets, "grandTotal": total, "totalToPay": total, "totalWithMargin": total}
