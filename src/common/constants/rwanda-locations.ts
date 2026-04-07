/**
 * Rwanda Administrative Divisions
 * Structure: Province → District → Sector
 *
 * Rwanda has:
 * - 5 provinces (City of Kigali + 4 provinces)
 * - 30 districts
 * - 416 sectors
 *
 * Sources:
 * - Wikipedia district articles (verified per district)
 * - Rwanda Revenue Authority (rra.gov.rw)
 * - ESR Online: 416 Sectors of Rwanda (esr.co.rw)
 * - NISR Population and Housing Census 2022
 */

// ─── Province → District → Sector[] ─────────────────────────────────────────

export const RWANDA_LOCATIONS: Record<string, Record<string, string[]>> = {
  "Kigali": {
    "Gasabo": [
      "Bumbogo", "Gatsata", "Gikomero", "Gisozi", "Jabana",
      "Jali", "Kacyiru", "Kimihurura", "Kimironko", "Kinyinya",
      "Ndera", "Nduba", "Remera", "Rusororo", "Rutunga",
    ],
    "Kicukiro": [
      "Gahanga", "Gatenga", "Gikondo", "Kagarama", "Kanombe",
      "Kicukiro", "Kigarama", "Masaka", "Niboye", "Nyarugunga",
    ],
    "Nyarugenge": [
      "Gitega", "Kanyinya", "Kigali", "Kimisagara", "Mageragere",
      "Muhima", "Nyakabanda", "Nyamirambo", "Nyarugenge", "Rwezamenyo",
    ],
  },

  "Eastern Province": {
    "Bugesera": [
      "Gashora", "Juru", "Kamabuye", "Mareba", "Mayange",
      "Musenyi", "Mwogo", "Ngeruka", "Ntarama", "Nyamata",
      "Nyarugenge", "Rilima", "Ruhuha", "Rweru", "Shyara",
    ],
    "Gatsibo": [
      "Gasange", "Gatsibo", "Gitoki", "Kabarore", "Kageyo",
      "Kiramuruzi", "Kiziguro", "Muhura", "Murambi", "Ngarama",
      "Nyagihanga", "Remera", "Rugarama", "Rwimbogo",
    ],
    "Kayonza": [
      "Gahini", "Kabare", "Kabarondo", "Mukarange", "Murama",
      "Murundi", "Mwiri", "Ndego", "Nyamirama", "Rukara",
      "Ruramira", "Rwinkwavu",
    ],
    "Kirehe": [
      "Gahara", "Gatore", "Kigarama", "Kigina", "Kirehe",
      "Mahama", "Mpanga", "Musaza", "Mushikiri", "Nasho",
      "Nyamugari", "Nyarubuye",
    ],
    "Ngoma": [
      "Gashanda", "Jarama", "Karembo", "Kazo", "Kibungo",
      "Mugesera", "Murama", "Mutenderi", "Remera", "Rukira",
      "Rukumberi", "Rurenge", "Sake", "Zaza",
    ],
    "Nyagatare": [
      "Gatunda", "Karama", "Karangazi", "Katabagemu", "Kiyombe",
      "Matimba", "Mimuli", "Mukama", "Musheli", "Nyagatare",
      "Rukomo", "Rwempasha", "Rwimiyaga", "Tabagwe",
    ],
    "Rwamagana": [
      "Fumbwe", "Gahengeri", "Gishali", "Karenge", "Kigabiro",
      "Muhazi", "Munyaga", "Munyiginya", "Musha", "Muyumbu",
      "Mwulire", "Nyakariro", "Nzige", "Rubona",
    ],
  },

  "Northern Province": {
    "Burera": [
      "Bungwe", "Butaro", "Cyanika", "Cyeru", "Gahunga",
      "Gatebe", "Gitovu", "Kagogo", "Kinoni", "Kinyababa",
      "Kivuye", "Nemba", "Rugarama", "Rugendabari", "Ruhunde",
      "Rusarabuye", "Rwerere",
    ],
    "Gakenke": [
      "Busengo", "Coko", "Cyabingo", "Gakenke", "Gashenyi",
      "Janja", "Kamubuga", "Karambo", "Kivuruga", "Mataba",
      "Minazi", "Muhondo", "Mugunga", "Muyongwe", "Muzo",
      "Nemba", "Ruli", "Rusasa", "Rushashi",
    ],
    "Gicumbi": [
      "Bukure", "Bwisige", "Byumba", "Cyumba", "Giti",
      "Kaniga", "Kageyo", "Manyagiro", "Miyove", "Mukarange",
      "Muko", "Mutete", "Nyamiyaga", "Nyankenke II", "Rubaya",
      "Rukomo", "Rushaki", "Rutare", "Ruvune", "Rwamiko",
      "Shangasha",
    ],
    "Musanze": [
      "Busogo", "Cyuve", "Gacaca", "Gashaki", "Gataraga",
      "Kimonyi", "Kinigi", "Muhoza", "Muko", "Musanze",
      "Nkotsi", "Nyange", "Remera", "Rwaza", "Shingiro",
    ],
    "Rulindo": [
      "Base", "Burega", "Bushoki", "Buyoga", "Cyinzuzi",
      "Cyungo", "Kinihira", "Kisaro", "Masoro", "Mbogo",
      "Murambi", "Ngoma", "Ntarabana", "Rukozo", "Rusiga",
      "Shyorongi", "Tumba",
    ],
  },

  "Southern Province": {
    "Gisagara": [
      "Gikonko", "Gishubi", "Kansi", "Kibilizi", "Kigembe",
      "Mamba", "Muganza", "Mugombwa", "Mukindo", "Musha",
      "Ndora", "Nyanza", "Save",
    ],
    "Huye": [
      "Gishamvu", "Huye", "Karama", "Kigoma", "Kinazi",
      "Maraba", "Mbazi", "Mukura", "Ngoma", "Ruhashya",
      "Rusatira", "Rwaniro", "Simbi", "Tumba",
    ],
    "Kamonyi": [
      "Gacurabwenge", "Karama", "Kayenzi", "Kayumbu", "Mugina",
      "Musambira", "Ngamba", "Nyamiyaga", "Nyarubaka", "Rugalika",
      "Rukoma", "Runda",
    ],
    "Muhanga": [
      "Cyeza", "Kabacuzi", "Kibangu", "Kiyumba", "Muhanga",
      "Mushishiro", "Nyabinoni", "Nyamabuye", "Nyarusange",
      "Rongi", "Rugendabari", "Shyogwe",
    ],
    "Nyamagabe": [
      "Buruhukiro", "Cyanika", "Gasaka", "Gatare", "Kaduha",
      "Kamegeli", "Kibirizi", "Kibumbwe", "Kitabi", "Mbazi",
      "Mugano", "Musange", "Musebeya", "Mushubi", "Nkomane",
      "Tare", "Uwinkingi",
    ],
    "Nyanza": [
      "Busasamana", "Busoro", "Cyabakamyi", "Kibirizi", "Kigoma",
      "Mukingo", "Muyira", "Ntyazo", "Nyagisozi", "Rwabicuma",
    ],
    "Nyaruguru": [
      "Busanze", "Cyahinda", "Kibeho", "Kivu", "Mata",
      "Muganza", "Munini", "Ngera", "Ngoma", "Nyabimata",
      "Nyagisozi", "Ruheru", "Ruramba", "Rusenge",
    ],
    "Ruhango": [
      "Byimana", "Bweramana", "Kabagari", "Kinazi", "Kinihira",
      "Mbuye", "Mwendo", "Ntongwe", "Ruhango",
    ],
  },

  "Western Province": {
    "Karongi": [
      "Bwishyura", "Gishari", "Gishyita", "Gitesi", "Mubuga",
      "Murambi", "Murundi", "Mutuntu", "Rubengera", "Rugabano",
      "Ruganda", "Rwankuba", "Twumba",
    ],
    "Ngororero": [
      "Bwira", "Gatumba", "Hindiro", "Kabaya", "Kageyo",
      "Kavumu", "Matyazo", "Muhanda", "Muhororo", "Ndaro",
      "Ngororero", "Nyange", "Sovu",
    ],
    "Nyabihu": [
      "Bigogwe", "Jenda", "Jomba", "Kabatwa", "Karago",
      "Kintobo", "Mukamira", "Muringa", "Rambura", "Rugera",
      "Rurembo", "Shyira",
    ],
    "Nyamasheke": [
      "Bushekeri", "Bushenge", "Cyato", "Gihombo", "Kagano",
      "Kanjongo", "Karambi", "Karengera", "Kirimbi", "Macuba",
      "Mahembe", "Nyabitekeri", "Rangiro", "Ruharambuga", "Shangi",
    ],
    "Rubavu": [
      "Bugeshi", "Busasamana", "Cyanzarwe", "Gisenyi", "Kanama",
      "Kanzenze", "Mudende", "Nyakiliba", "Nyamyumba",
      "Nyundo", "Rubavu", "Rugerero",
    ],
    "Rusizi": [
      "Bugarama", "Butare", "Bweyeye", "Gashonga", "Giheke",
      "Gihundwe", "Gikundamvura", "Gitambi", "Kamembe",
      "Muganza", "Mururu", "Nkanka", "Nkombo", "Nkungu",
      "Nyakabuye", "Nyakarenzo", "Nzahaha", "Rwimbogo",
    ],
    "Rutsiro": [
      "Boneza", "Gihango", "Kigeyo", "Kivumu", "Manihira",
      "Mukura", "Murunda", "Musasa", "Mushonyi", "Mushubati",
      "Nyabirasi", "Ruhango", "Rusebeya",
    ],
  },
};

// ─── Flat lookup: District → Sector[] ────────────────────────────────────────

export const SECTORS_BY_DISTRICT: Record<string, string[]> = Object.values(
  RWANDA_LOCATIONS,
).reduce(
  (acc, districts) => {
    for (const [district, sectors] of Object.entries(districts)) {
      acc[district] = sectors;
    }
    return acc;
  },
  {} as Record<string, string[]>,
);

// ─── All provinces ────────────────────────────────────────────────────────────

export const RWANDA_PROVINCES: string[] = Object.keys(RWANDA_LOCATIONS);

// ─── All districts (flat) ────────────────────────────────────────────────────

export const RWANDA_DISTRICTS: string[] = Object.values(RWANDA_LOCATIONS).flatMap(
  (districts) => Object.keys(districts),
);

// ─── Helper: get districts for a given province ───────────────────────────────

export function getDistrictsByProvince(province: string): string[] {
  return Object.keys(RWANDA_LOCATIONS[province] ?? {});
}

// ─── Helper: get sectors for a given district ────────────────────────────────

export function getSectorsByDistrict(district: string): string[] {
  return SECTORS_BY_DISTRICT[district] ?? [];
}

// ─── Helper: get province that contains a district ───────────────────────────

export function getProvinceByDistrict(district: string): string | undefined {
  for (const [province, districts] of Object.entries(RWANDA_LOCATIONS)) {
    if (district in districts) return province;
  }
  return undefined;
}
