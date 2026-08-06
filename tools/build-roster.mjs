/**
 * Builds public/data/roster.json from the transcription of Special Orders 66,
 * Hq 153rd FA Bn, 24 August 1945 (microfilm frames 248-252).
 *
 * The transcription lives here rather than in the JSON so the source rows stay
 * readable and diffable. Serial numbers are the identity key throughout.
 *
 *   node tools/build-roster.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public/data/roster.json");

// grade | name | ASN | MOS | MCO | ASR | profile
const OFFICERS = `
CAPT   | Finell, Charles V.   | O-912893   | 2162 | | 106NO43.5 | Q
1st Lt | Hersey, Walter E.    | O-1183831  | 9312 | | 100NO38.1 | Q
1st Lt | Hinson, Marvin G.    | O-1179891  | 0605 | | 104NO40.0 | Q
1st Lt | Frith, Warner H.     | O-1175712  | 1981 | | 106NO37.0 | Q
2d Lt  | Miller, Leon D.      | O-2008340  | 1193 | | 107NO30.0 | Q
2d Lt  | Nesbitt, Dwain E.    | O-2008362  | 0600 | | 105NO40.0 | Q
`;

const ENLISTED = `
M Sgt | Blissitte, Urshel A     | 6266854  | 502 | 245 | 93  | Q
M Sgt | Brown, Clayton C        | 6893141  | 502 | 235 | 97  | Q
1 Sgt | Andrews, Paul W         | 35200371 | 845 | 053 | 94  | Q
1 Sgt | George, Francis W       | 32134403 | 845 | 590 | 89  | Q
1 Sgt | McGinnis, Garnet A      | 33404058 | 821 | 010 | 83  | Q
T Sgt | Gerth, Fred L           | 6268906  | 814 | 220 | 92  | Q
T Sgt | Fercoski, Joseph J      | 31049324 | 747 | 014 | 89  | Q
S Sgt | Blake, James S          | 38010052 | 648 | 499 | 91  | Q
S Sgt | Bronsing, John J        | 34287995 | 821 | 010 | 84  | Q | asn
S Sgt | Doeden, John L          | 37073906 | 014 | 449 | 86  | Q
S Sgt | Dorsey, Otis J          | 6959325  | 845 | 010 | 98  | Q
S Sgt | Griffith, William B     | 32248212 | 014 | 106 | 86  | Q
S Sgt | Jacobs, Stewart J       | 31013826 | 824 | 017 | 91  | Q
S Sgt | Klont, Bruce W.         | 36192813 | 577 | 590 | 86  | Q
S Sgt | Luttrell, Wayne R       | 7084433  | 014 | 010 | 86  | Q
S Sgt | Raisberg, Roland H      | 33386993 | 845 | 050 | 83  | Q
S Sgt | Tachetter, Russell      | 37124267 | 648 | 371 | 90  | Q
S Sgt | Underwood, Francis J    | 37074795 | 821 | 245 | 85  | Q
Sgt   | Anderson, Lemuel H      | 34289426 | 845 | 345 | 88  | Q
Sgt   | Barthikowski, Stanley T | 15107316 | 014 | 334 | 82  | Q
Sgt   | Rawson, David O         | 39027463 | 667 | 010 | 83  | Q
Sgt   | Walters, Amos E.        | 36522977 | 845 | 499 | 86  | Q
Tec 4 | Banninger, Harold G     | 37001751 | 014 | 499 | 89  | Q
Tec 4 | Barker, Alston D        | 35577210 | 060 | 590 | 86  | Q
Tec 4 | Blews, Arnold E         | 33033083 | 014 | 014 | 91  | Q
Tec 4 | Clark, Jr., Bertram D   | 38002289 | 648 | 316 | 99  | D
Tec 4 | Ervin, Tommie P         | 34032131 | 060 | 302 | 100 | Q
Tec 4 | George, Tobias G        | 33082681 | 648 | 204 | 84  | Q
Tec 4 | Golda, John             | 33081857 | 014 | 010 | 88  | Q
Tec 4 | Higgins, Everett        | 35115709 | 845 | 499 | 89  | Q
Tec 4 | Lombardi, Fulvio A      | 33388738 | 319 | 201 | 78  | Q
Tec 4 | McAlester, Clarence E   | 34127780 | 802 | 302 | 88  | Q
Tec 4 | McDonald, Pat           | 6287420  | 014 | 010 | 93  | Q
Tec 4 | Obert, Donald J         | 6826063  | 824 | 010 | 93  | Q
Tec 4 | Robinson, Bernard C     | 12008741 | 776 | 480 | 86  | Q
Tec 4 | Steffen, Vincent L      | 37158509 | 673 | 345 | 79  | Q
Tec 4 | Kmochansky, Nicholas    | 39021630 | 060 | 037 | 91  | Q
Cpl   | Cearley, Ralph A        | 34353200 | 845 | 499 | 95  | Q
Cpl   | Goldstick, Jack F       | 33388846 | 405 | 010 | 78  | Q
Cpl   | Holland, L. Z.          | 37066987 | 228 | 499 | 100 | Q
Cpl   | Holm, Robert H          | 32172414 | 455 | 350 | 82  | Q
Cpl   | Hon, Earl H             | 35265048 | 911 | 590 | 91  | Q
Cpl   | Howell, Herbert D       | 36366522 | 845 | 010 | 81  | Q
Cpl   | Johanson, Leslie F      | 39377268 | 405 | 252 | 89  | Q
Cpl   | Kramer, Fabian J        | 32663021 | 641 | 199 | 82  | Q
Cpl   | Kramer, Norman A        | 33483616 | 845 | 200 | 78  | Q
Cpl   | Nothstein, Paul R       | 33484531 | 605 | 245 | 90  | Q
Cpl   | Rowell, William A       | 14046885 | 348 | 499 | 98  | Q
Cpl   | Turek, Frank J          | 13171039 | 845 | 457 | 90  | Q
Tec 5 | Adams, Thomas H         | 18017734 | 542 | 010 | 92  | Q
Tec 5 | Bearden, Ben F          | 38154142 | 931 | 235 | 83  | Q
Tec 5 | Breese, Elmer L         | 32756091 | 931 | 245 | 91  | Q
Tec 5 | Evans, Donald L         | 33122781 | 861 | 144 | 89  | Q
Tec 5 | Fisk, Paul J            | 36192911 | 931 | 010 | 93  | Q
Tec 5 | Hall, Donald R          | 7022078  | 721 | 113 | 97  | Q
Tec 5 | Jones, George P         | 36067355 | 345 | 499 | 86  | Q
Tec 5 | Leax, John R            | 33403870 | 931 | 055 | 78  | Q
Tec 5 | Lecleir, William T      | 37165244 | 345 | 499 | 85  | Q
Tec 5 | Loimaugh, Ralph E       | 18016642 | 319 | 014 | 92  | Q | name
Tec 5 | Martin, Ottis J         | 33386893 | 931 | 245 | 78  | Q
Tec 5 | McCoy, James M          | 15377211 | 345 | 245 | 78  | Q
Tec 5 | Minnick, Virgil C       | 33399681 | 641 | 203 | 92  | Q
Tec 5 | Nutter, Reuban V        | 33483653 | 931 | 302 | 78  | Q
Tec 5 | Phillips, Billie J      | 18005337 | 844 | 050 | 105 | Q
Tec 5 | Phillips, Edwin J       | 39085965 | 345 | 245 | 88  | Q
Tec 5 | Plunkett, Irie C        | 38117068 | 931 | 499 | 77  | Q
Tec 5 | Poer, Louis A           | 39151060 | 931 | 245 | 94  | Q
Tec 5 | Price, James A          | 18008262 | 824 | 245 | 105 | Q
Tec 5 | Price, John P           | 6285404  | 014 | 245 | 97  | Q
Tec 5 | Reichi, Joseph B        | 33484513 | 275 | 590 | 79  | D
Tec 5 | Schnaufer, Richard A    | 36041603 | 641 | 605 | 86  | Q
Tec 5 | Thomas, Charles W       | 33259877 | 345 | 199 | 78  | Q
Tec 5 | Tierce, Jasper B        | 34332726 | 245 | 345 | 89  | Q
Tec 5 | VanHoutan, Guy W        | 37011807 | 345 | 499 | 83  | Q
Tec 5 | Wills, Paul             | 35128736 | 776 | 014 | 86  | Q
Pfc   | Abbott, Wilson C        | 6281319  | 844 | 480 | 93  | Q
Pfc   | Atkison, Albert G       | 33403767 | 345 | 255 | 78  | Q
Pfc   | Balderson, Graham A     | 33519388 | 845 | 499 | 90  | Q
Pfc   | Buchanan, Sam R         | 38066138 | 845 | 499 | 85  | Q
Pfc   | Centers, Elzie          | 35644643 | 345 | 245 | 87  | Q
Pfc   | Coates, Ross W          | 33041857 | 605 | 010 | 96  | Q
Pfc   | Cox, General C          | 18018630 | 641 | 499 | 93  | Q
Pfc   | Curry, Charles E        | 38065083 | 067 | 026 | 100 | Q
Pfc   | Davis, Emmit            | 34150088 | 641 | 590 | 91  | Q
Pfc   | Dennis, Jack            | 6296151  | 931 | 010 | 90  | Q
Pfc   | Dudley, Jr, Edward J    | 33388818 | 845 | 201 | 90  | Q
Pfc   | Edwards, Claude F       | 33474203 | 845 | 010 | 78  | Q
Pfc   | Hamilton, David R       | 34817692 | 228 | 070 | 91  | Q
Pfc   | Harling, Ralph J L      | 34349424 | 845 | 499 | 81  | Q
Pfc   | Harvey, Leonard         | 6274271  | 821 | 245 | 93  | Q
Pfc   | Hatton, Charles D       | 35115633 | 845 | 499 | 101 | Q
Pfc   | Hogan, Owen R.          | 18008228 | 014 | 080 | 105 | Q
Pfc   | Jones, George R         | 6293345  | 821 | 010 | 89  | Q
Pfc   | Kmiotek, Frank A        | 33178740 | 845 | 499 | 83  | Q
Pfc   | Larson, Clarence A      | 36239144 | 845 | 323 | 84  | Q
Pfc   | Lee, Obert G            | 36215654 | 014 | 499 | 80  | Q
Pfc   | Lyman, Earl F           | 39161694 | 761 | 027 | 83  | Q
Pfc   | Mackalonis, Peter J     | 13006986 | 657 | 590 | 102 | Q
Pfc   | Malone, Edward E        | 6271484  | 824 | 060 | 92  | Q
Pfc   | Martinez, Ralph V       | 37087631 | 845 | 244 | 91  | Q
Pfc   | Mays, Charles I         | 6943520  | 345 | 245 | 97  | Q
Pfc   | McKoski, Joseph J       | 35013798 | 641 | 590 | 87  | Q
Pfc   | Menies, Jeremiah J      | 32259241 | 345 | 345 | 100 | Q
Pfc   | Mickle, Gerald L        | 36303752 | 228 | 590 | 95  | Q
Pfc   | O'Brien, Charles F      | 6956491  | 060 | 345 | 104 | Q
Pfc   | Poteat, Coy M           | 33517335 | 060 | 037 | 90  | Q
Pfc   | Radovic, Joseph R       | 36369602 | 645 | 129 | 81  | Q
Pfc   | Rappocdio, Joseph R     | 32341806 | 345 | 302 | 87  | Q | name
Pfc   | Reese, Kenneth D        | 33493961 | 657 | 010 | 83  | Q
Pfc   | Rohrig, Marvin W        | 33484548 | 845 | 291 | 90  | Q
Pfc   | Robbins, Joseph W       | 31272448 | 931 | 245 | 80  | Q
Pfc   | Shirley, Dewayne N      | 6953800  | 845 | 499 | 88  | Q
Pfc   | Smith, Marcus L         | 18005335 | 844 | 244 | 105 | Q
Pfc   | Stark, Albert L         | 6256683  | 577 | 010 | 93  | Q
Pfc   | Tagillo, Nunzio E       | 33403837 | 845 | 245 | 90  | Q
Pfc   | Voloshen, William       | 31032148 | 747 | 012 | 93  | Q
Pfc   | Warren, Burl W          | 6296845  | 845 | 499 | 93  | Q
Pfc   | Yancey, Ralph T         | 39402734 | 345 | 590 | 81  | Q
Pfc   | Zouski, John            | 36281601 | 776 | 245 | 89  | Q
Pvt   | Alexander, John H       | 18019180 | 821 | 050 | 98  | Q
Pvt   | Askins, Bob             | 6238750  | 345 | 345 | 87  | Q
Pvt   | Baker, Jr, Andrew J     | 33386663 | 845 | 011 | 78  | Q
Pvt   | Blicha, Steve           | 33397311 | 641 | 027 | 85  | Q
Pvt   | Dukes, Grady            | 34071950 | 824 | 060 | 87  | D
Pvt   | Evans, Marvin H         | 36301242 | 345 | 373 | 96  | Q
Pvt   | Garrett, Jr, George P   | 330?????  | 776 | 321 | 95  | Q | asn
Pvt   | Gibson, Robert G        | 18011222 | 844 | 050 | 93  | Q
Pvt   | Hayes, John W           | 6589091  | 641 | 590 | 86  | Q
Pvt   | Holland, Lynn E         | 6268882  | 821 | 017 | 98  | Q
Pvt   | Houk, James E           | 34289248 | 605 | 010 | 95  | Q
Pvt   | Kubinak, Jr, Nicholas J | 12020677 | 802 | 590 | 102 | Q
Pvt   | Lefthand, Jacob E       | 6594441  | 845 | 245 | 85  | Q
Pvt   | Pankey, Walter A        | 38066378 | 845 | 590 | 84  | Q
Pvt   | Pardue, Billie F        | 6287029  | 844 | 010 | 105 | Q
Pvt   | Rickard, Paul E         | 35165768 | 776 | 113 | 98  | Q
Pvt   | Ruck, Thomas H          | 20342109 | 345 | 499 | 90  | Q
`;

function parse(block, isOfficer) {
  return block
    .trim()
    .split("\n")
    .map((line) => {
      const [grade, name, asn, mos, mco, asr, profile, uncertain] = line
        .split("|")
        .map((s) => s.trim());
      const person = { asn, name, grade, mos: mos || null, profile: profile || null };
      if (mco) person.mco = mco;
      if (isOfficer) person.asrRaw = asr;
      else person.asr = Number(asr);
      person.officer = isOfficer;
      // Flag fields whose reading is not certain, rather than presenting a guess as fact.
      if (uncertain) person.uncertain = uncertain.split(",").map((s) => s.trim());
      return person;
    });
}

const people = [...parse(OFFICERS, true), ...parse(ENLISTED, false)];

const seen = new Set();
for (const p of people) {
  if (seen.has(p.asn)) throw new Error(`duplicate serial number ${p.asn} (${p.name})`);
  seen.add(p.asn);
}

const payload = {
  order: {
    type: "Special Orders",
    number: "66",
    headquarters: "Headquarters, 153rd Field Artillery Battalion",
    apo: "APO 758",
    date: "1945-08-24",
    effective: "1945-08-26",
    destination: "70th Infantry Division, APO 70",
    authority: ["XXIII Corps", "32nd Field Artillery Brigade"],
    verbatim:
      "The following-named O & EM, this headquarters, are trfd in gr to the 70th Inf Div, " +
      "APO 70, U.S. Army. Auth: VOCG XXIII Corps & 32d F.A. Brigade. EDCMR 26 August 1945.",
    signedBy: { name: "Donald Kerr", rank: "Major, F.A.", role: "Adjutant" },
    frames: [248, 249, 250, 251, 252],
    note:
      "The order covers officers and enlisted men of the whole battalion. It carries no " +
      "battery column, so a man on this list cannot be assigned to Battery C from it alone.",
  },
  columns: {
    asn: "Army serial number",
    mos: "Military occupational specialty",
    mco: "Second code as printed; its meaning has not been established",
    asr: "Adjusted Service Rating — the points score that decided who went home first",
    profile: "Physical profile",
  },
  people,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(payload));
const officers = people.filter((p) => p.officer).length;
console.log(
  `roster.json: ${people.length} men (${officers} officers, ${people.length - officers} enlisted), ` +
    `${new Set(people.map((p) => p.mos)).size} distinct MOS, ` +
    `${(JSON.stringify(payload).length / 1024).toFixed(1)} kB`,
);
