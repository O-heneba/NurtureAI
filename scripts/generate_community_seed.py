import json
import re
from pathlib import Path

def parse_coordinate(value: str) -> str | None:
    if not value or value.strip() == "":
        return None
    value = value.strip().replace('°', '').replace('º', '')
    match = re.match(r"([0-9.]+)\s*([NSEW])", value, re.I)
    if not match:
        return None
    degrees, hemi = match.groups()
    coord = float(degrees)
    if hemi.upper() in ('S', 'W'):
        coord = -coord
    return f"{coord:.6f}"


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", '_', value)
    value = re.sub(r"_+", '_', value).strip('_')
    return value or 'community'


input_path = Path('data/northern-ghana-communities.json')
output_path = Path('supabase/migrations/20260721130000_seed_northern_ghana_communities.sql')

records = json.loads(input_path.read_text(encoding='utf-8'))
rows = []
for record in records:
    region = record.get('Region') or None
    district = record.get('District') or None
    capital = record.get('Capital Town') or None
    gps_lat = parse_coordinate(record.get('GPS Latitude', ''))
    gps_lng = parse_coordinate(record.get('GPS Longitude', ''))
    councils = record.get('Sub-districts / Councils', '')
    sub_district = next((part.strip() for part in councils.split(',') if part.strip()), None)
    name = district or capital or 'Unnamed community'
    community_code = slugify(district or name)
    location_desc = capital
    rows.append({
        'name': name,
        'community_code': community_code,
        'region': region,
        'district': district,
        'sub_district': sub_district,
        'gps_lat': gps_lat,
        'gps_lng': gps_lng,
        'location_desc': location_desc,
        'status': 'active',
    })

with output_path.open('w', encoding='utf-8') as f:
    f.write('-- Seed communities from Northern Ghana workbook\n')
    f.write('BEGIN;\n')
    for row in rows:
        columns = [
            'name', 'community_code', 'region', 'district', 'sub_district',
            'gps_lat', 'gps_lng', 'location_desc', 'status'
        ]
        values = []
        for col in columns:
            value = row[col]
            if value is None:
                values.append('NULL')
            elif col in ('gps_lat', 'gps_lng'):
                values.append(str(value))
            else:
                escaped = str(value).replace("'", "''")
                values.append(f"'{escaped}'")
        f.write('INSERT INTO public.communities (' + ', '.join(columns) + ') VALUES (' + ', '.join(values) + ');\n')
    f.write('COMMIT;\n')

print(f'Wrote {len(rows)} insert statements to {output_path}')
