import zipfile
import json
import xml.etree.ElementTree as ET
from pathlib import Path

input_path = Path('Northern ghana communities.xlsx')
out_path = Path('data/northern-ghana-communities.json')

with zipfile.ZipFile(input_path) as z:
    workbook = ET.fromstring(z.read('xl/workbook.xml'))
    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    sheet = workbook.find('ns:sheets/ns:sheet', ns)
    if sheet is None:
        raise SystemExit('No sheet found in workbook')

    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rel_ns = {'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}
    rid = sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
    target = next((rel.attrib['Target'] for rel in rels.findall('r:Relationship', rel_ns) if rel.attrib.get('Id') == rid), None)
    if not target:
        raise SystemExit('Worksheet relationship target not found')

    xml = ET.fromstring(z.read('xl/' + target))
    shared_strings = {}
    try:
        shared_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for i, si in enumerate(shared_root.findall('ns:si', ns)):
            t = si.find('ns:t', ns)
            shared_strings[i] = t.text if t is not None else ''
    except KeyError:
        pass

    rows = []
    for row in xml.findall('ns:sheetData/ns:row', ns):
        values = []
        for c in row.findall('ns:c', ns):
            v = c.find('ns:v', ns)
            if v is None:
                values.append('')
            elif c.attrib.get('t') == 's':
                values.append(shared_strings.get(int(v.text), ''))
            else:
                values.append(v.text or '')
        rows.append(values)

headers = [h.strip() for h in rows[0]]
records = [dict(zip(headers, [v.strip() for v in row])) for row in rows[1:]]

out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'Wrote {len(records)} records to {out_path}')
