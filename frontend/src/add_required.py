import re

with open('Prospects.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    tag = match.group(0)
    if 'type="checkbox"' in tag or "type='checkbox'" in tag: return tag
    if 'type="radio"' in tag or "type='radio'" in tag: return tag
    if 'type="file"' in tag or "type='file'" in tag: return tag
    if 'required' in tag: return tag
    
    if tag.startswith('<input'):
        return tag.replace('<input', '<input required', 1)
    elif tag.startswith('<select'):
        return tag.replace('<select', '<select required', 1)
    elif tag.startswith('<textarea'):
        return tag.replace('<textarea', '<textarea required', 1)
    return tag

new_content = re.sub(r'<(input|select|textarea)\b[^>]*>', replacer, content)

with open('Prospects.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
