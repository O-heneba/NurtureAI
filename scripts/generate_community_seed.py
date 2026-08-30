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


COMMUNITIES_BY_DISTRICT = {
    'Tamale Metropolitan': ['Tamale', 'Aboabo', 'Lamashegu', 'Jisonayili', 'Vittin'],
    'Sagnarigu Municipal': ['Sagnarigu', 'Kanvilli', 'Dungu', 'Choggu', 'Kpalsogu'],
    'Savelugu Municipal': ['Savelugu', 'Diare', 'Pong-Tamale', 'Moglaa', 'Nanton'],
    'Yendi Municipal': ['Yendi', 'Gbungbaliga', 'Sunson', 'Adibo', 'Nakpali'],
    'Gushegu Municipal': ['Gushegu', 'Kpatinga', 'Zantili', 'Namong', 'Galwei'],
    'Karaga District': ['Karaga', 'Pishigu', 'Bagurugu', 'Nyong Nayili', 'Kpatinga'],
    'Kumbungu District': ['Kumbungu', 'Dalun', 'Zangbalun', 'Gbanjong', 'Voggu'],
    'Tolon District': ['Tolon', 'Tali', 'Nyankpala', 'Kasuliyili', 'Tinguli'],
    'Kpandai District': ['Kpandai', 'Kamarche', 'Katiejeli', 'Nkanchina', 'Balai'],
    'Mion District': ['Sang', 'Kpatinga', 'Dungu', 'Kuhu', 'Yoggu'],
    'Nanumba North Municipal': ['Bimbilla', 'Nakpayili', 'Chamba', 'Juo', 'Gbanjong'],
    'Nanumba South District': ['Wulensi', 'Nakpanduri', 'Lungni', 'Dakpam', 'Jilo'],
    'Saboba District': ['Saboba', 'Wapuli', 'Nakpanduri', 'Sambuli', 'Chamba'],
    'Tatale-Sangule District': ['Tatale', 'Sanguli', 'Nabuli', 'Kandin', 'Kpalime'],
    'Zabzugu District': ['Zabzugu', 'Kukpaligu', 'Nakpali', 'Gbanjong', 'Bincheratanga'],
    'Bole District': ['Bole', 'Bamboi', 'Tinga', 'Mandari', 'Jama'],
    'Sawla-Tuna-Kalba District': ['Sawla', 'Tuna', 'Kalba', 'Larabanga', 'Bole-Bamboi'],
    'West Gonja Municipal': ['Damongo', 'Larabanga', 'Busunu', 'Mognori', 'Canteen'],
    'North Gonja District': ['Daboya', 'Mankarigu', 'Lingbinsi', 'Kparigu', 'Jentilpe'],
    'Central Gonja District': ['Buipe', 'Yapei', 'Kpalbe', 'Kusawgu', 'Mpaha'],
    'East Gonja Municipal': ['Salaga', 'Kpembe', 'Makango', 'Kpandai', 'Bunjai'],
    'North East Gonja District': ['Kpalbe', 'Nabori', 'Jentilpe', 'Wiae', 'Kantompe'],
    'West Mamprusi Municipal': ['Walewale', 'Wungu', 'Janga', 'Loagri', 'Nasia'],
    'East Mamprusi Municipal': ['Nalerigu', 'Gambaga', 'Langbinsi', 'Gbintiri', 'Sakogu'],
    'Mamprugu Moagduri District': ['Yagaba', 'Kubori', 'Loagri', 'Zagsi', 'Soo'],
    'Bunkpurugu-Nyakpanduri District': ['Bunkpurugu', 'Nakpanduri', 'Namoo', 'Kambatiak', 'Nasuan'],
    'Chereponi District': ['Chereponi', 'Wapuli', 'Tinjase', 'Garinkuka', 'Naafian'],
    'Yunyoo-Nasuan District': ['Yunyoo', 'Nasuan', 'Wawaani', 'Nakpanduri', 'Jimbale'],
    'Bolgatanga Municipal': ['Bolgatanga', 'Zaare', 'Dorogo', 'Tindonsobligo', 'Atolisum'],
    'Bolgatanga East District': ['Zuarungu', 'Yorogo', 'Sherigu', 'Sumbrungu', 'Bongo Soe'],
    'Bawku Municipal': ['Bawku', 'Zongoyiri', 'Azanga', 'Kpalung', 'Mognori'],
    'Bawku West District': ['Zebila', 'Tilli', 'Widnaba', 'Binaba', 'Sapielga'],
    'Binduri District': ['Binduri', 'Kugri', 'Zawse', 'Bazua', 'Asangwa'],
    'Bongo District': ['Bongo', 'Namoo', 'Gowrie', 'Zoko', 'Balungu'],
    'Builsa North Municipal': ['Sandema', 'Wiaga', 'Chuchuliga', 'Kadema', 'Kanjarga'],
    'Builsa South District': ['Fumbisi', 'Uwasi', 'Gbedema', 'Kanjarga', 'Chansa'],
    'Garu District': ['Garu', 'Tempane', 'Kugri', 'Denugu', 'Akara'],
    'Kassena Nankana Municipal': ['Navrongo', 'Paga', 'Naaga', 'Manyoro', 'Doba'],
    'Kassena Nankana West District': ['Paga', 'Chiana', 'Mirigu', 'Katiu', 'Sirigu'],
    'Nabdam District': ['Nangodi', 'Pelungu', 'Sakoti', 'Zanlerigu', 'Nyogorigo'],
    'Pusiga District': ['Pusiga', 'Widnaba', 'Kulbia', 'Zongoiri', 'Atuba'],
    'Talensi District': ['Tongo', 'Winkogo', 'Pwalugu', 'Datuku', 'Baare'],
    'Tempane District': ['Tempane', 'Garu', 'Kulbia', 'Natinga', 'Widana'],
    'Wa Municipal': ['Wa', 'Kpongu', 'Boli', 'Kambali', 'Dobile'],
    'Wa East District': ['Funsi', 'Bulenga', 'Loggu', 'Kundugu', 'Vieri'],
    'Wa West District': ['Wechiau', 'Lassie', 'Dorimon', 'Vieri', 'Gurungu'],
    'Nadowli-Kaleo District': ['Nadowli', 'Kaleo', 'Daffiama', 'Charikpong', 'Sombo'],
    'Daffiama Bussie Issa District': ['Daffiama', 'Bussie', 'Issa', 'Siiru', 'Kojokperi'],
    'Jirapa Municipal': ['Jirapa', 'Tizza', 'Ullo', 'Hain', 'Birifoh'],
    'Lawra Municipal': ['Lawra', 'Eremon', 'Babile', 'Zambo', 'Durba'],
    'Nandom Municipal': ['Nandom', 'Ko', 'Piina', 'Hamile', 'Pizaga'],
    'Lambussie District': ['Lambussie', 'Piina', 'Karni', 'Pulima', 'Samoa'],
    'Sissala East Municipal': ['Tumu', 'Gwollu', 'Wellembelle', 'Fielmuo', 'Bujan'],
    'Sissala West District': ['Gwollu', 'Fian', 'Jeffisi', 'Pulima', 'Kowie'],
}


input_path = Path('data/northern-ghana-communities.json')
output_path = Path('supabase/migrations/20260826000000_seed_northern_ghana_communities.sql')
json_output_path = Path('data/northern-ghana-community-records.json')

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
    community_names = COMMUNITIES_BY_DISTRICT.get(district, [])
    if not community_names:
        continue
    for name in community_names:
        rows.append({
            'name': name,
            'community_code': slugify(f'{region}_{district}_{name}'),
            'region': region,
            'district': district,
            'sub_district': sub_district,
            'gps_lat': gps_lat,
            'gps_lng': gps_lng,
            'location_desc': capital,
            'status': 'active',
        })

with output_path.open('w', encoding='utf-8') as f:
    f.write('-- Seed communities from Northern Ghana workbook\n')
    f.write('BEGIN;\n')
    old_codes = ', '.join(
        "'" + slugify(record.get('District', '')) + "'"
        for record in records
    )
    f.write(f'DELETE FROM public.communities WHERE community_code IN ({old_codes});\n')
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

json_output_path.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding='utf-8')

print(f'Wrote {len(rows)} insert statements to {output_path}')
