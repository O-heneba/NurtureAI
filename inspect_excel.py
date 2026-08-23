import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
p = Path(r'C:/Users/O_heneba/Desktop/nurture-ghana/Northern ghana communities.xlsx')
with zipfile.ZipFile(p) as z:
    print('files:')
    for name in z.namelist():
        print('  ', name)
    workbook_xml = z.read('xl/workbook.xml')
    print('\nworkbook.xml:')
    print(workbook_xml.decode('utf-8')[:2000])
    workbook = ET.fromstring(workbook_xml)
    ns = {'ns':'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
    sheets = []
    for s in workbook.findall('ns:sheets/ns:sheet', ns):
        rid = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        sheets.append((s.attrib['name'], rid, dict(s.attrib)))
    print('\nsheets:', sheets)
    ss = {}
    try:
        shared_xml = z.read('xl/sharedStrings.xml')
        shared = ET.fromstring(shared_xml)
        for i, si in enumerate(shared.findall('ns:si', ns)):
            t = si.find('ns:t', ns)
            ss[i] = t.text if t is not None else ''
    except KeyError:
        pass
    rels_xml = z.read('xl/_rels/workbook.xml.rels')
    print('\nworkbook rels:')
    print(rels_xml.decode('utf-8'))
    rels = ET.fromstring(rels_xml)
    rel_ns = {'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}
    for rel in rels.findall('r:Relationship', rel_ns):
        print('  rel', rel.attrib)
    for name, rid, attrs in sheets:
        print('\nSheet', name, 'rid', rid, 'attrs', attrs)
        target = None
        for rel in rels.findall('r:Relationship', rel_ns):
            if rel.attrib.get('Id') == rid:
                target = 'xl/' + rel.attrib['Target']
                break
        print('  target:', target)
        if target is None:
            continue
        sheet = ET.fromstring(z.read(target))
        print('  first rows:')
        for i, row in enumerate(sheet.findall('ns:sheetData/ns:row', ns), start=1):
            values = []
            for c in row.findall('ns:c', ns):
                v = c.find('ns:v', ns)
                if v is None:
                    values.append('')
                elif c.attrib.get('t') == 's':
                    values.append(ss.get(int(v.text), ''))
                else:
                    values.append(v.text)
            print('   ', tuple(values))
            if i >= 10:
                break
