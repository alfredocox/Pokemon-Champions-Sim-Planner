// ============================================================
// POKEMON DATA â VGC 2026 Reg M (Champions Format)
// ============================================================

// Type color map
const TYPE_COLORS = {
  Normal:'#A8A878',Fire:'#F08030',Water:'#6890F0',Electric:'#F8D030',Grass:'#78C850',
  Ice:'#98D8D8',Fighting:'#C03028',Poison:'#A040A0',Ground:'#E0C068',Flying:'#A890F0',
  Psychic:'#F85888',Bug:'#A8B820',Rock:'#B8A038',Ghost:'#705898',Dragon:'#7038F8',
  Dark:'#705848',Steel:'#B8B8D0',Fairy:'#EE99AC'
};

// Base stat pools for damage calculation
const BASE_STATS = {
  Incineroar:     { hp:95, atk:115, def:90, spa:80, spd:90, spe:60, types:['Fire','Dark'] },
  Arcanine:       { hp:90, atk:110, def:80, spa:100, spd:80, spe:95, types:['Fire'] },
  Garchomp:       { hp:108, atk:130, def:95, spa:80, spd:85, spe:102, types:['Dragon','Ground'] },
  // Mega Altaria team
  'Typhlosion-Hisui': { hp:84, atk:68, def:78, spa:119, spd:85, spe:95, types:['Fire','Ghost'] },
  'Altaria-Mega':  { hp:75, atk:110, def:110, spa:110, spd:105, spe:80, types:['Dragon','Fairy'] },
  Whimsicott:     { hp:60, atk:67, def:85, spa:77, spd:75, spe:116, types:['Grass','Fairy'] },
  'Rotom-Wash':   { hp:50, atk:65, def:107, spa:105, spd:107, spe:86, types:['Electric','Water'] },
  Sableye:        { hp:50, atk:75, def:75, spa:65, spd:65, spe:50, types:['Dark','Ghost'] },
  Sinistcha:      { hp:71, atk:60, def:106, spa:121, spd:80, spe:70, types:['Grass','Ghost'] },
  // Mega Dragonite team
  // T9j.3b: corrected to Champions canonical 91/124/115/145/125/100 (BST 700).
  // Prior values (91/175/95/100/100/80) were an SV port and produced inflated
  // physical damage. Sources: Game8, RotomLabs Champions, Serebii Champions Pokedex.
  'Dragonite-Mega': { hp:91, atk:124, def:115, spa:145, spd:125, spe:100, types:['Dragon','Flying'] },
  'Basculegion':  { hp:120, atk:112, def:65, spa:80, spd:75, spe:78, types:['Water','Ghost'] },
  Liepard:        { hp:64, atk:88, def:50, spa:88, spd:50, spe:106, types:['Dark'] },
  Archaludon:     { hp:90, atk:105, def:130, spa:125, spd:65, spe:85, types:['Steel','Dragon'] },
  Pelipper:       { hp:60, atk:50, def:100, spa:95, spd:70, spe:65, types:['Water','Flying'] },
  Orthworm:       { hp:70, atk:85, def:145, spa:60, spd:55, spe:40, types:['Steel'] },
  // Mega Houndoom
  'Houndoom-Mega': { hp:75, atk:90, def:90, spa:140, spd:90, spe:115, types:['Dark','Fire'] },
  Torkoal:        { hp:70, atk:85, def:140, spa:85, spd:70, spe:20, types:['Fire'] },
  Farigiraf:      { hp:120, atk:90, def:70, spa:90, spd:90, spe:60, types:['Normal','Psychic'] },
  // T9j.3b: corrected to Champions canonical 78/85/110/160/116/36 (BST 585).
  // Sources: Game8, RotomLabs Champions, Bulbapedia.
  'Drampa-Mega':  { hp:78, atk:85, def:110, spa:160, spd:116, spe:36, types:['Normal','Dragon'] },
  // Rin Sand
  Sneasler:       { hp:80, atk:130, def:60, spa:40, spd:80, spe:120, types:['Fighting','Poison'] },
  Tyranitar:      { hp:100, atk:134, def:110, spa:95, spd:100, spe:61, types:['Rock','Dark'] },
  Excadrill:      { hp:110, atk:135, def:60, spa:50, spd:65, spe:88, types:['Ground','Steel'] },
  Dragapult:      { hp:88, atk:120, def:75, spa:100, spd:75, spe:142, types:['Dragon','Ghost'] },
  Meganium:       { hp:80, atk:82, def:100, spa:83, spd:100, spe:80, types:['Grass'] },
  // Suica Sun
  Charizard:      { hp:78, atk:84, def:78, spa:109, spd:85, spe:100, types:['Fire','Flying'] },
  Venusaur:       { hp:80, atk:82, def:83, spa:100, spd:100, spe:80, types:['Grass','Poison'] },
  // Cofagrigus TR
  Cofagrigus:     { hp:58, atk:50, def:145, spa:95, spd:105, spe:30, types:['Ghost'] },
  Cresselia:      { hp:120, atk:70, def:120, spa:75, spd:130, spe:85, types:['Psychic'] },
  Gothitelle:     { hp:70, atk:55, def:95, spa:95, spd:110, spe:65, types:['Psychic'] },
  Dusclops:       { hp:40, atk:70, def:130, spa:60, spd:130, spe:25, types:['Ghost'] },
  'Flutter Mane': { hp:55, atk:55, def:55, spa:135, spd:135, spe:135, types:['Ghost','Fairy'] },
  Hatterene:      { hp:57, atk:90, def:95, spa:136, spd:103, spe:29, types:['Psychic','Fairy'] },
  // New meta entries
  'Charizard-Mega-Y': { hp:78, atk:104, def:78, spa:159, spd:115, spe:100, types:['Fire','Flying'] },
  'Charizard-Mega-X': { hp:78, atk:130, def:111, spa:130, spd:85, spe:100, types:['Fire','Dragon'] },
  'Tyranitar-Mega': { hp:100, atk:164, def:150, spa:95, spd:120, spe:71, types:['Rock','Dark'] },
  // T9j.3b: corrected to Champions canonical 70/80/70/140/100/120 (BST 580).
  // Sources: Game8, OP.GG Champions, RotomLabs.
  'Froslass-Mega': { hp:70, atk:80, def:70, spa:140, spd:100, spe:120, types:['Ice','Ghost'] },
  Milotic:         { hp:95, atk:60, def:79, spa:100, spd:125, spe:81, types:['Water'] },
  Kingambit:       { hp:100, atk:135, def:120, spa:60, spd:85, spe:50, types:['Dark','Steel'] },
  Amoonguss:       { hp:114, atk:85, def:70, spa:85, spd:80, spe:30, types:['Grass','Poison'] },
  Gholdengo:       { hp:87, atk:60, def:95, spa:133, spd:91, spe:84, types:['Steel','Ghost'] },
  'Ursaluna-Bloodmoon': { hp:113, atk:70, def:85, spa:135, spd:95, spe:55, types:['Ground','Normal'] },
  Maushold:        { hp:74, atk:75, def:70, spa:65, spd:75, spe:111, types:['Normal'] },
  Dragonite:       { hp:91, atk:134, def:95, spa:100, spd:100, spe:80, types:['Dragon','Flying'] },  // T9e: species used by preloaded tournament teams (14-20)
  Talonflame:      { hp:78, atk:81, def:71, spa:74, spd:69, spe:126, types:['Fire','Flying'] },
  Gengar:          { hp:60, atk:65, def:60, spa:130, spd:75, spe:110, types:['Ghost','Poison'] },
  Golurk:          { hp:89, atk:124, def:80, spa:55, spd:80, spe:55, types:['Ground','Ghost'] },
  'Golurk-Mega':   { hp:89, atk:159, def:105, spa:70, spd:105, spe:55, types:['Ground','Ghost'] },
  'Kommo-o':       { hp:75, atk:110, def:125, spa:100, spd:105, spe:85, types:['Dragon','Fighting'] },
  Aerodactyl:      { hp:80, atk:105, def:65, spa:60, spd:75, spe:130, types:['Rock','Flying'] },
  'Floette (Eternal Flower)': { hp:74, atk:65, def:67, spa:125, spd:128, spe:92, types:['Fairy'] },
  'Floette (Eternal Flower)-Mega': { hp:74, atk:85, def:87, spa:155, spd:148, spe:102, types:['Fairy'] },
  'Rotom-Heat':    { hp:50, atk:65, def:107, spa:105, spd:107, spe:86, types:['Electric','Fire'] },
  Froslass:        { hp:70, atk:80, def:70, spa:80, spd:70, spe:110, types:['Ice','Ghost'] },
  Clefable:        { hp:95, atk:70, def:73, spa:95, spd:90, spe:60, types:['Fairy'] },
  'Gengar-Mega':   { hp:60, atk:65, def:80, spa:170, spd:95, spe:130, types:['Ghost','Poison'] },
  'Aerodactyl-Mega': { hp:80, atk:135, def:85, spa:70, spd:95, spe:150, types:['Rock','Flying'] },
  'Meganium-Mega': { hp:80, atk:92, def:115, spa:143, spd:115, spe:80, types:['Grass','Fairy'] },
  Lopunny:         { hp:65, atk:76, def:84, spa:54, spd:96, spe:105, types:['Normal'] },
  'Lopunny-Mega':  { hp:65, atk:136, def:94, spa:54, spd:96, spe:135, types:['Normal','Fighting'] },
  Aegislash:       { hp:60, atk:50, def:150, spa:50, spd:150, spe:60, types:['Steel','Ghost'] },
  Vanilluxe:       { hp:71, atk:95, def:85, spa:110, spd:95, spe:79, types:['Ice'] },

  // T9j.7: base-form stats for Mega base species referenced by loaded teams.
  // Sources: Bulbapedia, RotomLabs Champions dex.
  Altaria:         { hp:75, atk:70, def:90, spa:70, spd:105, spe:80, types:['Dragon','Flying'] },
  Drampa:          { hp:78, atk:60, def:85, spa:135, spd:91, spe:36, types:['Normal','Dragon'] },
  Houndoom:        { hp:75, atk:90, def:50, spa:110, spd:80, spe:95, types:['Dark','Fire'] },

};


// Sprite URLs (PokeAPI)
// Comprehensive dex number map â covers 400+ VGC-relevant + common PokÃ©mon.
// For anything not listed, we fall back to PokeAPI by slugified name.
const DEX_NUM_MAP = {
  // Gen 1
  'Bulbasaur':1,'Ivysaur':2,'Venusaur':3,'Charmander':4,'Charmeleon':5,'Charizard':6,
  'Squirtle':7,'Wartortle':8,'Blastoise':9,'Caterpie':10,'Metapod':11,'Butterfree':12,
  'Weedle':13,'Kakuna':14,'Beedrill':15,'Pidgey':16,'Pidgeot':18,'Rattata':19,'Raticate':20,
  'Spearow':21,'Fearow':22,'Ekans':23,'Arbok':24,'Pikachu':25,'Raichu':26,
  'Sandshrew':27,'Sandslash':28,'Nidoran-F':29,'Nidorina':30,'Nidoqueen':31,
  'Nidoran-M':32,'Nidorino':33,'Nidoking':34,'Clefairy':35,'Clefable':36,
  'Vulpix':37,'Ninetales':38,'Jigglypuff':39,'Wigglytuff':40,'Zubat':41,'Golbat':42,
  'Oddish':43,'Gloom':44,'Vileplume':45,'Paras':46,'Parasect':47,'Venonat':48,'Venomoth':49,
  'Diglett':50,'Dugtrio':51,'Meowth':52,'Persian':53,'Psyduck':54,'Golduck':55,
  'Mankey':56,'Primeape':57,'Growlithe':58,'Arcanine':59,'Poliwag':60,'Poliwhirl':61,
  'Poliwrath':62,'Abra':63,'Kadabra':64,'Alakazam':65,'Machop':66,'Machoke':67,'Machamp':68,
  'Bellsprout':69,'Weepinbell':70,'Victreebel':71,'Tentacool':72,'Tentacruel':73,
  'Geodude':74,'Graveler':75,'Golem':76,'Ponyta':77,'Rapidash':78,
  'Slowpoke':79,'Slowbro':80,'Magnemite':81,'Magneton':82,'Farfetchd':83,
  'Doduo':84,'Dodrio':85,'Seel':86,'Dewgong':87,'Grimer':88,'Muk':89,
  'Shellder':90,'Cloyster':91,'Gastly':92,'Haunter':93,'Gengar':94,
  'Onix':95,'Drowzee':96,'Hypno':97,'Krabby':98,'Kingler':99,
  'Voltorb':100,'Electrode':101,'Exeggcute':102,'Exeggutor':103,'Cubone':104,'Marowak':105,
  'Hitmonlee':106,'Hitmonchan':107,'Lickitung':108,'Koffing':109,'Weezing':110,
  'Rhyhorn':111,'Rhydon':112,'Chansey':113,'Tangela':114,'Kangaskhan':115,
  'Horsea':116,'Seadra':117,'Goldeen':118,'Seaking':119,'Staryu':120,'Starmie':121,
  'Mr-Mime':122,'Scyther':123,'Jynx':124,'Electabuzz':125,'Magmar':126,'Pinsir':127,
  'Tauros':128,'Magikarp':129,'Gyarados':130,'Lapras':131,'Ditto':132,'Eevee':133,
  'Vaporeon':134,'Jolteon':135,'Flareon':136,'Porygon':137,'Omanyte':138,'Omastar':139,
  'Kabuto':140,'Kabutops':141,'Aerodactyl':142,'Snorlax':143,'Articuno':144,'Zapdos':145,
  'Moltres':146,'Dratini':147,'Dragonair':148,'Dragonite':149,'Mewtwo':150,'Mew':151,
  // Gen 2
  'Chikorita':152,'Bayleef':153,'Meganium':154,'Cyndaquil':155,'Quilava':156,
  'Typhlosion':157,'Totodile':158,'Croconaw':159,'Feraligatr':160,
  'Sentret':161,'Furret':162,'Hoothoot':163,'Noctowl':164,'Ledyba':165,'Ledian':166,
  'Spinarak':167,'Ariados':168,'Crobat':169,'Chinchou':170,'Lanturn':171,
  'Pichu':172,'Cleffa':173,'Igglybuff':174,'Togepi':175,'Togetic':176,
  'Natu':177,'Xatu':178,'Mareep':179,'Flaaffy':180,'Ampharos':181,
  'Bellossom':182,'Marill':183,'Azumarill':184,'Sudowoodo':185,'Politoed':186,
  'Hoppip':187,'Skiploom':188,'Jumpluff':189,'Aipom':190,'Sunkern':191,'Sunflora':192,
  'Yanma':193,'Wooper':194,'Quagsire':195,'Espeon':196,'Umbreon':197,
  'Murkrow':198,'Slowking':199,'Misdreavus':200,'Unown':201,'Wobbuffet':202,
  'Girafarig':203,'Pineco':204,'Forretress':205,'Dunsparce':206,'Gligar':207,
  'Steelix':208,'Snubbull':209,'Granbull':210,'Qwilfish':211,'Scizor':212,
  'Shuckle':213,'Heracross':214,'Sneasel':215,'Teddiursa':216,'Ursaring':217,
  'Slugma':218,'Magcargo':219,'Swinub':220,'Piloswine':221,'Corsola':222,
  'Remoraid':223,'Octillery':224,'Delibird':225,'Mantine':226,'Skarmory':227,
  'Houndour':228,'Houndoom':229,'Kingdra':230,'Phanpy':231,'Donphan':232,
  'Porygon2':233,'Stantler':234,'Smeargle':235,'Tyrogue':236,'Hitmontop':237,
  'Smoochum':238,'Elekid':239,'Magby':240,'Miltank':241,'Blissey':242,
  'Raikou':243,'Entei':244,'Suicune':245,'Larvitar':246,'Pupitar':247,'Tyranitar':248,
  'Lugia':249,'Ho-Oh':250,'Celebi':251,
  // Gen 3
  'Treecko':252,'Grovyle':253,'Sceptile':254,'Torchic':255,'Combusken':256,'Blaziken':257,
  'Mudkip':258,'Marshtomp':259,'Swampert':260,'Poochyena':261,'Mightyena':262,
  'Zigzagoon':263,'Linoone':264,'Wurmple':265,'Silcoon':266,'Beautifly':267,
  'Cascoon':268,'Dustox':269,'Lotad':270,'Lombre':271,'Ludicolo':272,
  'Seedot':273,'Nuzleaf':274,'Shiftry':275,'Taillow':276,'Swellow':277,
  'Wingull':278,'Pelipper':279,'Ralts':280,'Kirlia':281,'Gardevoir':282,
  'Surskit':283,'Masquerain':284,'Shroomish':285,'Breloom':286,
  'Slakoth':287,'Vigoroth':288,'Slaking':289,'Nincada':290,'Ninjask':291,'Shedinja':292,
  'Whismur':293,'Loudred':294,'Exploud':295,'Makuhita':296,'Hariyama':297,
  'Azurill':298,'Nosepass':299,'Skitty':300,'Delcatty':301,'Sableye':302,'Mawile':303,
  'Aron':304,'Lairon':305,'Aggron':306,'Meditite':307,'Medicham':308,
  'Electrike':309,'Manectric':310,'Plusle':311,'Minun':312,'Volbeat':313,'Illumise':314,
  'Roselia':315,'Gulpin':316,'Swalot':317,'Carvanha':318,'Sharpedo':319,
  'Wailmer':320,'Wailord':321,'Numel':322,'Camerupt':323,'Torkoal':324,
  'Spoink':325,'Grumpig':326,'Spinda':327,'Trapinch':328,'Vibrava':329,'Flygon':330,
  'Cacnea':331,'Cacturne':332,'Swablu':333,'Altaria':334,'Zangoose':335,'Seviper':336,
  'Lunatone':337,'Solrock':338,'Barboach':339,'Whiscash':340,'Corphish':341,'Crawdaunt':342,
  'Baltoy':343,'Claydol':344,'Lileep':345,'Cradily':346,'Anorith':347,'Armaldo':348,
  'Feebas':349,'Milotic':350,'Castform':351,'Kecleon':352,'Shuppet':353,'Banette':354,
  'Duskull':355,'Dusclops':356,'Tropius':357,'Chimecho':358,'Absol':359,
  'Wynaut':360,'Snorunt':361,'Glalie':362,'Spheal':363,'Sealeo':364,'Walrein':365,
  'Clamperl':366,'Huntail':367,'Gorebyss':368,'Relicanth':369,'Luvdisc':370,
  'Bagon':371,'Shelgon':372,'Salamence':373,'Beldum':374,'Metang':375,'Metagross':376,
  'Regirock':377,'Regice':378,'Registeel':379,'Latias':380,'Latios':381,
  'Kyogre':382,'Groudon':383,'Rayquaza':384,'Jirachi':385,'Deoxys':386,
  // Gen 4
  'Turtwig':387,'Grotle':388,'Torterra':389,'Chimchar':390,'Monferno':391,'Infernape':392,
  'Piplup':393,'Prinplup':394,'Empoleon':395,'Starly':396,'Staravia':397,'Staraptor':398,
  'Bidoof':399,'Bibarel':400,'Kricketot':401,'Kricketune':402,'Shinx':403,'Luxio':404,'Luxray':405,
  'Budew':406,'Roserade':407,'Cranidos':408,'Rampardos':409,'Shieldon':410,'Bastiodon':411,
  'Burmy':412,'Wormadam':413,'Mothim':414,'Combee':415,'Vespiquen':416,
  'Pachirisu':417,'Buizel':418,'Floatzel':419,'Cherubi':420,'Cherrim':421,
  'Shellos':422,'Gastrodon':423,'Ambipom':424,'Drifloon':425,'Drifblim':426,
  'Buneary':427,'Lopunny':428,'Mismagius':429,'Honchkrow':430,'Glameow':431,'Purugly':432,
  'Chingling':433,'Stunky':434,'Skuntank':435,'Bronzor':436,'Bronzong':437,
  'Bonsly':438,'Mime-Jr':439,'Happiny':440,'Chatot':441,'Spiritomb':442,
  'Gible':443,'Gabite':444,'Garchomp':445,'Munchlax':446,'Riolu':447,'Lucario':448,
  'Hippopotas':449,'Hippowdon':450,'Skorupi':451,'Drapion':452,'Croagunk':453,'Toxicroak':454,
  'Carnivine':455,'Finneon':456,'Lumineon':457,'Mantyke':458,'Snover':459,'Abomasnow':460,
  'Weavile':461,'Magnezone':462,'Lickilicky':463,'Rhyperior':464,'Tangrowth':465,
  'Electivire':466,'Magmortar':467,'Togekiss':468,'Yanmega':469,'Leafeon':470,'Glaceon':471,
  'Gliscor':472,'Mamoswine':473,'Porygon-Z':474,'Gallade':475,'Probopass':476,'Dusknoir':477,
  'Froslass':478,'Rotom':479,'Uxie':480,'Mesprit':481,'Azelf':482,
  'Dialga':483,'Palkia':484,'Heatran':485,'Regigigas':486,'Giratina':487,
  'Cresselia':488,'Phione':489,'Manaphy':490,'Darkrai':491,'Shaymin':492,'Arceus':493,
  // Gen 5
  'Victini':494,'Snivy':495,'Servine':496,'Serperior':497,'Tepig':498,'Pignite':499,'Emboar':500,
  'Oshawott':501,'Dewott':502,'Samurott':503,'Patrat':504,'Watchog':505,
  'Lillipup':506,'Herdier':507,'Stoutland':508,'Purrloin':509,'Liepard':510,
  'Pansage':511,'Simisage':512,'Pansear':513,'Simisear':514,'Panpour':515,'Simipour':516,
  'Munna':517,'Musharna':518,'Pidove':519,'Tranquill':520,'Unfezant':521,
  'Blitzle':522,'Zebstrika':523,'Roggenrola':524,'Boldore':525,'Gigalith':526,
  'Woobat':527,'Swoobat':528,'Drilbur':529,'Excadrill':530,
  'Audino':531,'Timburr':532,'Gurdurr':533,'Conkeldurr':534,
  'Tympole':535,'Palpitoad':536,'Seismitoad':537,'Throh':538,'Sawk':539,
  'Sewaddle':540,'Swadloon':541,'Leavanny':542,'Venipede':543,'Whirlipede':544,'Scolipede':545,
  'Cottonee':546,'Whimsicott':547,'Petilil':548,'Lilligant':549,
  'Basculin':550,'Sandile':551,'Krokorok':552,'Krookodile':553,
  'Darumaka':554,'Darmanitan':555,'Maractus':556,'Dwebble':557,'Crustle':558,
  'Scraggy':559,'Scrafty':560,'Sigilyph':561,'Yamask':562,'Cofagrigus':563,
  'Tirtouga':564,'Carracosta':565,'Archen':566,'Archeops':567,
  'Trubbish':568,'Garbodor':569,'Zorua':570,'Zoroark':571,
  'Minccino':572,'Cinccino':573,'Gothita':574,'Gothorita':575,'Gothitelle':576,
  'Solosis':577,'Duosion':578,'Reuniclus':579,'Ducklett':580,'Swanna':581,
  'Vanillite':582,'Vanillish':583,'Vanilluxe':584,'Deerling':585,'Sawsbuck':586,
  'Emolga':587,'Karrablast':588,'Escavalier':589,'Foongus':590,'Amoonguss':591,
  'Frillish':592,'Jellicent':593,'Alomomola':594,'Joltik':595,'Galvantula':596,
  'Ferroseed':597,'Ferrothorn':598,'Klink':599,'Klang':600,'Klinklang':601,
  'Tynamo':602,'Eelektrik':603,'Eelektross':604,'Elgyem':605,'Beheeyem':606,
  'Litwick':607,'Lampent':608,'Chandelure':609,'Axew':610,'Fraxure':611,'Haxorus':612,
  'Cubchoo':613,'Beartic':614,'Cryogonal':615,'Shelmet':616,'Accelgor':617,
  'Stunfisk':618,'Mienfoo':619,'Mienshao':620,'Druddigon':621,
  'Golett':622,'Golurk':623,'Pawniard':624,'Bisharp':625,'Bouffalant':626,
  'Rufflet':627,'Braviary':628,'Vullaby':629,'Mandibuzz':630,
  'Heatmor':631,'Durant':632,'Deino':633,'Zweilous':634,'Hydreigon':635,
  'Larvesta':636,'Volcarona':637,'Cobalion':638,'Terrakion':639,'Virizion':640,
  'Tornadus':641,'Thundurus':642,'Reshiram':643,'Zekrom':644,'Landorus':645,
  'Kyurem':646,'Keldeo':647,'Meloetta':648,'Genesect':649,
  // Gen 6
  'Chespin':650,'Quilladin':651,'Chesnaught':652,'Fennekin':653,'Braixen':654,'Delphox':655,
  'Froakie':656,'Frogadier':657,'Greninja':658,'Bunnelby':659,'Diggersby':660,
  'Fletchling':661,'Fletchinder':662,'Talonflame':663,'Scatterbug':664,'Spewpa':665,'Vivillon':666,
  'Litleo':667,'Pyroar':668,'Flabebe':669,'Floette':670,'Florges':671,
  'Skiddo':672,'Gogoat':673,'Pancham':674,'Pangoro':675,'Furfrou':676,
  'Espurr':677,'Meowstic':678,'Honedge':679,'Doublade':680,'Aegislash':681,
  'Spritzee':682,'Aromatisse':683,'Swirlix':684,'Slurpuff':685,
  'Inkay':686,'Malamar':687,'Binacle':688,'Barbaracle':689,
  'Skrelp':690,'Dragalge':691,'Clauncher':692,'Clawitzer':693,
  'Helioptile':694,'Heliolisk':695,'Tyrunt':696,'Tyrantrum':697,
  'Amaura':698,'Aurorus':699,'Sylveon':700,'Hawlucha':701,
  'Dedenne':702,'Carbink':703,'Goomy':704,'Sliggoo':705,'Goodra':706,
  'Klefki':707,'Phantump':708,'Trevenant':709,'Pumpkaboo':710,'Gourgeist':711,
  'Bergmite':712,'Avalugg':713,'Noibat':714,'Noivern':715,
  'Xerneas':716,'Yveltal':717,'Zygarde':718,'Diancie':719,'Hoopa':720,'Volcanion':721,
  // Gen 7
  'Rowlet':722,'Dartrix':723,'Decidueye':724,'Litten':725,'Torracat':726,'Incineroar':727,
  'Popplio':728,'Brionne':729,'Primarina':730,'Pikipek':731,'Trumbeak':732,'Toucannon':733,
  'Yungoos':734,'Gumshoos':735,'Grubbin':736,'Charjabug':737,'Vikavolt':738,
  'Crabrawler':739,'Crabominable':740,'Oricorio':741,'Cutiefly':742,'Ribombee':743,
  'Rockruff':744,'Lycanroc':745,'Wishiwashi':746,'Mareanie':747,'Toxapex':748,
  'Mudbray':749,'Mudsdale':750,'Dewpider':751,'Araquanid':752,
  'Fomantis':753,'Lurantis':754,'Morelull':755,'Shiinotic':756,
  'Salandit':757,'Salazzle':758,'Stufful':759,'Bewear':760,
  'Bounsweet':761,'Steenee':762,'Tsareena':763,'Comfey':764,
  'Oranguru':765,'Passimian':766,'Wimpod':767,'Golisopod':768,
  'Sandygast':769,'Palossand':770,'Pyukumuku':771,'Type-Null':772,'Silvally':773,
  'Minior':774,'Komala':775,'Turtonator':776,'Togedemaru':777,
  'Mimikyu':778,'Bruxish':779,'Drampa':780,'Dhelmise':781,
  'Jangmo-o':782,'Hakamo-o':783,'Kommo-o':784,
  'Tapu-Koko':785,'Tapu-Lele':786,'Tapu-Bulu':787,'Tapu-Fini':788,
  'Cosmog':789,'Cosmoem':790,'Solgaleo':791,'Lunala':792,'Nihilego':793,'Buzzwole':794,
  'Pheromosa':795,'Xurkitree':796,'Celesteela':797,'Kartana':798,'Guzzlord':799,
  'Necrozma':800,'Magearna':801,'Marshadow':802,'Poipole':803,'Naganadel':804,
  'Stakataka':805,'Blacephalon':806,'Zeraora':807,'Meltan':808,'Melmetal':809,
  // Gen 8
  'Grookey':810,'Thwackey':811,'Rillaboom':812,'Scorbunny':813,'Raboot':814,'Cinderace':815,
  'Sobble':816,'Drizzile':817,'Inteleon':818,'Skwovet':819,'Greedent':820,
  'Rookidee':821,'Corvisquire':822,'Corviknight':823,'Blipbug':824,'Dottler':825,'Orbeetle':826,
  'Nickit':827,'Thievul':828,'Gossifleur':829,'Eldegoss':830,'Wooloo':831,'Dubwool':832,
  'Chewtle':833,'Drednaw':834,'Yamper':835,'Boltund':836,'Rolycoly':837,'Carkol':838,'Coalossal':839,
  'Applin':840,'Flapple':841,'Appletun':842,'Silicobra':843,'Sandaconda':844,
  'Cramorant':845,'Arrokuda':846,'Barraskewda':847,'Toxel':848,'Toxtricity':849,
  'Sizzlipede':850,'Centiskorch':851,'Clobbopus':852,'Grapploct':853,
  'Sinistea':854,'Polteageist':855,'Hatenna':856,'Hattrem':857,'Hatterene':858,
  'Impidimp':859,'Morgrem':860,'Grimmsnarl':861,'Obstagoon':862,'Perrserker':863,
  'Cursola':864,'Sirfetchd':865,'Mr-Rime':866,'Runerigus':867,'Milcery':868,'Alcremie':869,
  'Falinks':870,'Pincurchin':871,'Snom':872,'Frosmoth':873,
  'Stonjourner':874,'Eiscue':875,'Indeedee':876,'Morpeko':877,'Cufant':878,'Copperajah':879,
  'Dracozolt':880,'Arctozolt':881,'Dracovish':882,'Arctovish':883,
  'Duraludon':884,'Dreepy':885,'Drakloak':886,'Dragapult':887,
  'Zacian':888,'Zamazenta':889,'Eternatus':890,
  'Kubfu':891,'Urshifu':892,'Zarude':893,'Regieleki':894,'Regidrago':895,
  'Glastrier':896,'Spectrier':897,'Calyrex':898,
  'Wyrdeer':899,'Kleavor':900,'Ursaluna':901,'Basculegion':902,'Sneasler':903,'Overqwil':904,
  'Enamorus':905,
  // Gen 9
  'Sprigatito':906,'Floragato':907,'Meowscarada':908,
  'Fuecoco':909,'Crocalor':910,'Skeledirge':911,
  'Quaxly':912,'Quaxwell':913,'Quaquaval':914,
  'Lechonk':915,'Oinkologne':916,'Tarountula':917,'Spidops':918,
  'Nymble':919,'Lokix':920,'Pawmi':921,'Pawmo':922,'Pawmot':923,
  'Tandemaus':924,'Maushold':925,'Fidough':926,'Dachsbun':927,
  'Smoliv':928,'Dolliv':929,'Arboliva':930,'Squawkabilly':931,
  'Nacli':932,'Naclstack':933,'Garganacl':934,'Charcadet':935,'Armarouge':936,'Ceruledge':937,
  'Tadbulb':938,'Bellibolt':939,'Wattrel':940,'Kilowattrel':941,
  'Maschiff':942,'Mabosstiff':943,'Shroodle':944,'Grafaiai':945,
  'Bramblin':946,'Brambleghast':947,'Toedscool':948,'Toedscruel':949,
  'Klawf':950,'Capsakid':951,'Scovillain':952,'Rellor':953,'Rabsca':954,
  'Flittle':955,'Espathra':956,'Tinkatink':957,'Tinkatuff':958,'Tinkaton':959,
  'Wiglett':960,'Wugtrio':961,'Bombirdier':962,'Finizen':963,'Palafin':964,
  'Varoom':965,'Revavroom':966,'Cyclizar':967,'Orthworm':968,
  'Glimmet':969,'Glimmora':970,'Greavard':971,'Houndstone':972,
  'Flamigo':973,'Cetoddle':974,'Cetitan':975,'Veluza':976,'Dondozo':977,
  'Tatsugiri':978,'Annihilape':979,'Clodsire':980,'Farigiraf':981,
  'Dudunsparce':982,'Kingambit':983,'Great-Tusk':984,'Scream-Tail':985,
  'Brute-Bonnet':986,'Flutter-Mane':987,'Slither-Wing':988,'Sandy-Shocks':989,
  'Iron-Treads':990,'Iron-Bundle':991,'Iron-Hands':992,'Iron-Jugulis':993,
  'Iron-Moth':994,'Iron-Thorns':995,'Frigibax':996,'Arctibax':997,'Baxcalibur':998,
  'Gimmighoul':999,'Gholdengo':1000,'Wo-Chien':1001,'Chien-Pao':1002,
  'Ting-Lu':1003,'Chi-Yu':1004,'Roaring-Moon':1005,'Iron-Valiant':1006,
  'Koraidon':1007,'Miraidon':1008,'Walking-Wake':1009,'Iron-Leaves':1010,
  'Dipplin':1011,'Poltchageist':1012,'Sinistcha':1013,'Okidogi':1014,
  'Munkidori':1015,'Fezandipiti':1016,'Ogerpon':1017,'Archaludon':1018,
  'Hydrapple':1019,'Gouging-Fire':1020,'Raging-Bolt':1021,
  'Iron-Boulder':1022,'Iron-Crown':1023,'Terapagos':1024,'Pecharunt':1025,
  // Alolan forms
  'Ninetales-Alola':38,'Sandshrew-Alola':27,'Sandslash-Alola':28,
  'Vulpix-Alola':37,'Raichu-Alola':26,'Meowth-Alola':52,'Persian-Alola':53,
  'Geodude-Alola':74,'Graveler-Alola':75,'Golem-Alola':76,
  'Grimer-Alola':88,'Muk-Alola':89,'Exeggutor-Alola':103,'Marowak-Alola':105,
  // Galarian forms
  'Meowth-Galar':52,'Ponyta-Galar':77,'Rapidash-Galar':78,'Slowpoke-Galar':79,
  'Slowbro-Galar':80,'Farfetchd-Galar':83,'Weezing-Galar':110,'Mr-Mime-Galar':122,
  'Corsola-Galar':222,'Zigzagoon-Galar':263,'Linoone-Galar':264,'Darumaka-Galar':554,
  'Darmanitan-Galar':555,'Yamask-Galar':562,'Stunfisk-Galar':618,
  // Hisuian forms
  'Typhlosion-Hisui':157,'Samurott-Hisui':503,'Decidueye-Hisui':724,
  'Zorua-Hisui':570,'Zoroark-Hisui':571,'Braviary-Hisui':628,
  'Sliggoo-Hisui':705,'Goodra-Hisui':706,'Avalugg-Hisui':713,'Lilligant-Hisui':549,
  'Voltorb-Hisui':100,'Electrode-Hisui':101,'Qwilfish-Hisui':211,
  // Mega forms (use base form number)
  'Altaria-Mega':334,'Dragonite-Mega':149,'Houndoom-Mega':229,'Drampa-Mega':780,
  'Kangaskhan-Mega':115,'Gyarados-Mega':130,'Mewtwo-Mega-X':150,'Mewtwo-Mega-Y':150,
  'Charizard-Mega-X':6,'Charizard-Mega-Y':6,'Blaziken-Mega':257,'Gardevoir-Mega':282,
  'Salamence-Mega':373,'Metagross-Mega':376,'Lopunny-Mega':428,'Scizor-Mega':212,
  'Heracross-Mega':214,'Tyranitar-Mega':248,'Aggron-Mega':306,'Medicham-Mega':308,
  'Absol-Mega':359,'Gengar-Mega':94,'Alakazam-Mega':65,'Ampharos-Mega':181,
  'Aerodactyl-Mega':142,'Lucario-Mega':448,'Abomasnow-Mega':460,'Manectric-Mega':310,
  // Rotom forms (all use 479)
  'Rotom-Wash':479,'Rotom-Heat':479,'Rotom-Frost':479,'Rotom-Fan':479,'Rotom-Mow':479,
  // Misc forms
  'Basculin-White':550,'Flutter Mane':1000,'Flutter-Mane':987,
  'Indeedee-F':876,'Indeedee-M':876,
  // Extra VGC-relevant
  'Amoonguss':591,'Urshifu-Single':892,'Urshifu-Rapid':892,
  'Calyrex-Shadow':898,'Calyrex-Ice':898,'Glastrier':896,'Spectrier':897,
  'Yveltal':717,'Xerneas':716,'Landorus-Therian':645,'Thundurus-Therian':642,
  'Tornadus-Therian':641,'Necrozma-Dusk':800,'Necrozma-Dawn':800,
  'Kyurem-Black':646,'Kyurem-White':646,'Zacian-Crowned':888,'Zamazenta-Crowned':889,
  'Urshifu-Rapid-Strike':892,'Miraidon':1008,'Koraidon':1007,
};

// Comprehensive type database for ~500 PokÃ©mon (all VGC-relevant + forms)
const POKEMON_TYPES_DB = {
  // Gen 1
  'Bulbasaur':['Grass','Poison'],'Ivysaur':['Grass','Poison'],'Venusaur':['Grass','Poison'],
  'Charmander':['Fire'],'Charmeleon':['Fire'],'Charizard':['Fire','Flying'],
  'Squirtle':['Water'],'Wartortle':['Water'],'Blastoise':['Water'],
  'Pikachu':['Electric'],'Raichu':['Electric'],
  'Arcanine':['Fire'],'Growlithe':['Fire'],
  'Ninetales':['Fire'],'Vulpix':['Fire'],
  'Gengar':['Ghost','Poison'],'Haunter':['Ghost','Poison'],'Gastly':['Ghost','Poison'],
  'Alakazam':['Psychic'],'Kadabra':['Psychic'],'Abra':['Psychic'],
  'Machamp':['Fighting'],'Machoke':['Fighting'],'Machop':['Fighting'],
  'Snorlax':['Normal'],'Munchlax':['Normal'],
  'Dragonite':['Dragon','Flying'],'Dragonair':['Dragon'],'Dratini':['Dragon'],
  'Gyarados':['Water','Flying'],'Magikarp':['Water'],
  'Jolteon':['Electric'],'Vaporeon':['Water'],'Flareon':['Fire'],
  'Espeon':['Psychic'],'Umbreon':['Dark'],'Leafeon':['Grass'],'Glaceon':['Ice'],
  'Sylveon':['Fairy'],'Eevee':['Normal'],
  'Mewtwo':['Psychic'],'Mew':['Psychic'],
  'Lapras':['Water','Ice'],'Kangaskhan':['Normal'],
  'Aerodactyl':['Rock','Flying'],'Snorlax':['Normal'],
  'Articuno':['Ice','Flying'],'Zapdos':['Electric','Flying'],'Moltres':['Fire','Flying'],
  'Starmie':['Water','Psychic'],'Staryu':['Water'],
  'Clefable':['Fairy'],'Clefairy':['Fairy'],
  'Togekiss':['Fairy','Flying'],'Togetic':['Fairy','Flying'],'Togepi':['Fairy'],
  'Porygon-Z':['Normal'],'Porygon2':['Normal'],'Porygon':['Normal'],
  'Chansey':['Normal'],'Blissey':['Normal'],
  'Ditto':['Normal'],
  // Gen 2
  'Typhlosion':['Fire'],'Quilava':['Fire'],'Cyndaquil':['Fire'],
  'Feraligatr':['Water'],'Croconaw':['Water'],'Totodile':['Water'],
  'Meganium':['Grass'],'Bayleef':['Grass'],'Chikorita':['Grass'],
  'Ampharos':['Electric'],'Flaaffy':['Electric'],'Mareep':['Electric'],
  'Scizor':['Bug','Steel'],'Heracross':['Bug','Fighting'],
  'Tyranitar':['Rock','Dark'],'Larvitar':['Rock','Ground'],'Pupitar':['Rock','Ground'],
  'Blissey':['Normal'],'Chansey':['Normal'],
  'Wobbuffet':['Psychic'],'Wynaut':['Psychic'],
  'Umbreon':['Dark'],'Espeon':['Psychic'],
  'Lugia':['Psychic','Flying'],'Ho-Oh':['Fire','Flying'],
  'Suicune':['Water'],'Entei':['Fire'],'Raikou':['Electric'],
  'Sneasel':['Dark','Ice'],'Weavile':['Dark','Ice'],
  'Houndoom':['Dark','Fire'],'Houndour':['Dark','Fire'],
  'Kingdra':['Water','Dragon'],
  'Slowking':['Water','Psychic'],'Slowbro':['Water','Psychic'],'Slowpoke':['Water','Psychic'],
  'Politoed':['Water'],
  'Azumarill':['Water','Fairy'],'Marill':['Water','Fairy'],
  'Skarmory':['Steel','Flying'],
  'Donphan':['Ground'],'Phanpy':['Ground'],
  'Miltank':['Normal'],
  'Misdreavus':['Ghost'],'Mismagius':['Ghost'],
  'Murkrow':['Dark','Flying'],'Honchkrow':['Dark','Flying'],
  'Gligar':['Ground','Flying'],'Gliscor':['Ground','Flying'],
  'Celebi':['Psychic','Grass'],
  // Gen 3
  'Blaziken':['Fire','Fighting'],'Combusken':['Fire','Fighting'],'Torchic':['Fire'],
  'Sceptile':['Grass'],'Grovyle':['Grass'],'Treecko':['Grass'],
  'Swampert':['Water','Ground'],'Marshtomp':['Water','Ground'],'Mudkip':['Water'],
  'Gardevoir':['Psychic','Fairy'],'Kirlia':['Psychic','Fairy'],'Ralts':['Psychic','Fairy'],
  'Gallade':['Psychic','Fighting'],
  'Salamence':['Dragon','Flying'],'Shelgon':['Dragon'],'Bagon':['Dragon'],
  'Metagross':['Steel','Psychic'],'Metang':['Steel','Psychic'],'Beldum':['Steel','Psychic'],
  'Garchomp':['Dragon','Ground'],'Gabite':['Dragon','Ground'],'Gible':['Dragon','Ground'],
  'Altaria':['Dragon','Flying'],'Swablu':['Normal','Flying'],
  'Flygon':['Ground','Dragon'],'Vibrava':['Ground','Dragon'],'Trapinch':['Ground'],
  'Aggron':['Steel','Rock'],'Lairon':['Steel','Rock'],'Aron':['Steel','Rock'],
  'Breloom':['Grass','Fighting'],'Shroomish':['Grass'],
  'Milotic':['Water'],'Feebas':['Water'],
  'Ludicolo':['Water','Grass'],'Lombre':['Water','Grass'],'Lotad':['Water','Grass'],
  'Shiftry':['Grass','Dark'],'Nuzleaf':['Grass','Dark'],'Seedot':['Grass'],
  'Walrein':['Ice','Water'],'Sealeo':['Ice','Water'],'Spheal':['Ice','Water'],
  'Glalie':['Ice'],'Snorunt':['Ice'],'Froslass':['Ice','Ghost'],
  'Whiscash':['Water','Ground'],'Barboach':['Water','Ground'],
  'Camerupt':['Fire','Ground'],'Numel':['Fire','Ground'],
  'Torkoal':['Fire'],
  'Tropius':['Grass','Flying'],
  'Claydol':['Ground','Psychic'],'Baltoy':['Ground','Psychic'],
  'Absol':['Dark'],
  'Medicham':['Fighting','Psychic'],'Meditite':['Fighting','Psychic'],
  'Sableye':['Dark','Ghost'],
  'Mawile':['Steel','Fairy'],
  'Regirock':['Rock'],'Regice':['Ice'],'Registeel':['Steel'],'Regigigas':['Normal'],
  'Latias':['Dragon','Psychic'],'Latios':['Dragon','Psychic'],
  'Kyogre':['Water'],'Groudon':['Ground'],'Rayquaza':['Dragon','Flying'],
  'Deoxys':['Psychic'],'Jirachi':['Steel','Psychic'],
  // Gen 4
  'Infernape':['Fire','Fighting'],'Monferno':['Fire','Fighting'],'Chimchar':['Fire'],
  'Empoleon':['Water','Steel'],'Prinplup':['Water','Steel'],'Piplup':['Water'],
  'Torterra':['Grass','Ground'],'Grotle':['Grass','Ground'],'Turtwig':['Grass'],
  'Staraptor':['Normal','Flying'],'Staravia':['Normal','Flying'],'Starly':['Normal','Flying'],
  'Lucario':['Fighting','Steel'],'Riolu':['Fighting'],
  'Hippowdon':['Ground'],'Hippopotas':['Ground'],
  'Toxicroak':['Poison','Fighting'],'Croagunk':['Poison','Fighting'],
  'Drapion':['Poison','Dark'],'Skorupi':['Poison','Bug'],
  'Abomasnow':['Grass','Ice'],'Snover':['Grass','Ice'],
  'Rotom':['Electric','Ghost'],
  'Rotom-Wash':['Electric','Water'],'Rotom-Heat':['Electric','Fire'],
  'Rotom-Frost':['Electric','Ice'],'Rotom-Fan':['Electric','Flying'],'Rotom-Mow':['Electric','Grass'],
  'Cresselia':['Psychic'],
  'Darkrai':['Dark'],
  'Dialga':['Steel','Dragon'],'Palkia':['Water','Dragon'],'Giratina':['Ghost','Dragon'],
  'Heatran':['Fire','Steel'],'Regigigas':['Normal'],
  'Shaymin':['Grass'],'Arceus':['Normal'],
  'Rhyperior':['Ground','Rock'],
  'Electivire':['Electric'],'Magmortar':['Fire'],
  'Togekiss':['Fairy','Flying'],
  'Porygon-Z':['Normal'],
  'Magnezone':['Electric','Steel'],'Probopass':['Rock','Steel'],
  'Dusknoir':['Ghost'],'Dusclops':['Ghost'],'Duskull':['Ghost'],
  'Froslass':['Ice','Ghost'],
  'Uxie':['Psychic'],'Mesprit':['Psychic'],'Azelf':['Psychic'],
  'Manaphy':['Water'],'Phione':['Water'],
  // Gen 5
  'Serperior':['Grass'],'Servine':['Grass'],'Snivy':['Grass'],
  'Emboar':['Fire','Fighting'],'Pignite':['Fire','Fighting'],'Tepig':['Fire'],
  'Samurott':['Water'],'Dewott':['Water'],'Oshawott':['Water'],
  'Excadrill':['Ground','Steel'],'Drilbur':['Ground','Steel'],
  'Conkeldurr':['Fighting'],'Gurdurr':['Fighting'],'Timburr':['Fighting'],
  'Seismitoad':['Water','Ground'],'Palpitoad':['Water','Ground'],'Tympole':['Water'],
  'Chandelure':['Ghost','Fire'],'Lampent':['Ghost','Fire'],'Litwick':['Ghost','Fire'],
  'Haxorus':['Dragon'],'Fraxure':['Dragon'],'Axew':['Dragon'],
  'Reuniclus':['Psychic'],'Duosion':['Psychic'],'Solosis':['Psychic'],
  'Hydreigon':['Dark','Dragon'],'Zweilous':['Dark','Dragon'],'Deino':['Dark'],
  'Volcarona':['Bug','Fire'],'Larvesta':['Bug','Fire'],
  'Cobalion':['Steel','Fighting'],'Terrakion':['Rock','Fighting'],'Virizion':['Grass','Fighting'],
  'Tornadus':['Flying'],'Thundurus':['Electric','Flying'],'Landorus':['Ground','Flying'],
  'Reshiram':['Dragon','Fire'],'Zekrom':['Dragon','Electric'],'Kyurem':['Dragon','Ice'],
  'Amoonguss':['Grass','Poison'],'Foongus':['Grass','Poison'],
  'Jellicent':['Water','Ghost'],'Frillish':['Water','Ghost'],
  'Ferrothorn':['Grass','Steel'],'Ferroseed':['Grass','Steel'],
  'Gothitelle':['Psychic'],'Gothorita':['Psychic'],'Gothita':['Psychic'],
  'Cofagrigus':['Ghost'],'Yamask':['Ghost'],
  'Sigilyph':['Psychic','Flying'],
  'Zoroark':['Dark'],'Zorua':['Dark'],
  'Liepard':['Dark'],'Purrloin':['Dark'],
  'Whimsicott':['Grass','Fairy'],'Cottonee':['Grass','Fairy'],
  'Lilligant':['Grass'],'Petilil':['Grass'],
  'Krookodile':['Ground','Dark'],'Krokorok':['Ground','Dark'],'Sandile':['Ground','Dark'],
  'Scrafty':['Dark','Fighting'],'Scraggy':['Dark','Fighting'],
  'Mienshao':['Fighting'],'Mienfoo':['Fighting'],
  'Bisharp':['Dark','Steel'],'Pawniard':['Dark','Steel'],
  'Mandibuzz':['Dark','Flying'],'Vullaby':['Dark','Flying'],
  'Braviary':['Normal','Flying'],'Rufflet':['Normal','Flying'],
  'Heatmor':['Fire'],'Durant':['Bug','Steel'],
  'Druddigon':['Dragon'],
  'Golurk':['Ground','Ghost'],'Golett':['Ground','Ghost'],
  'Stunfisk':['Ground','Electric'],
  'Galvantula':['Bug','Electric'],'Joltik':['Bug','Electric'],
  'Klinklang':['Steel'],'Klang':['Steel'],'Klink':['Steel'],
  'Beheeyem':['Psychic'],'Elgyem':['Psychic'],
  'Vanilluxe':['Ice'],'Vanillish':['Ice'],'Vanillite':['Ice'],
  'Beartic':['Ice'],'Cubchoo':['Ice'],
  'Cryogonal':['Ice'],
  'Accelgor':['Bug'],'Escavalier':['Bug','Steel'],
  'Bouffalant':['Normal'],
  'Genesect':['Bug','Steel'],
  'Meloetta':['Normal','Psychic'],
  'Keldeo':['Water','Fighting'],
  // Gen 6
  'Chesnaught':['Grass','Fighting'],'Quilladin':['Grass'],'Chespin':['Grass'],
  'Delphox':['Fire','Psychic'],'Braixen':['Fire'],'Fennekin':['Fire'],
  'Greninja':['Water','Dark'],'Frogadier':['Water'],'Froakie':['Water'],
  'Talonflame':['Fire','Flying'],'Fletchinder':['Fire','Flying'],'Fletchling':['Normal','Flying'],
  'Pyroar':['Fire','Normal'],'Litleo':['Fire','Normal'],
  'Aegislash':['Steel','Ghost'],'Doublade':['Steel','Ghost'],'Honedge':['Steel','Ghost'],
  'Sylveon':['Fairy'],
  'Hawlucha':['Fighting','Flying'],
  'Goodra':['Dragon'],'Sliggoo':['Dragon'],'Goomy':['Dragon'],
  'Noivern':['Flying','Dragon'],'Noibat':['Flying','Dragon'],
  'Diancie':['Rock','Fairy'],
  'Hoopa':['Psychic','Ghost'],
  'Volcanion':['Fire','Water'],
  'Xerneas':['Fairy'],'Yveltal':['Dark','Flying'],'Zygarde':['Dragon','Ground'],
  'Pangoro':['Fighting','Dark'],'Pancham':['Fighting'],
  'Trevenant':['Ghost','Grass'],'Phantump':['Ghost','Grass'],
  'Aromatisse':['Fairy'],'Spritzee':['Fairy'],
  'Slurpuff':['Fairy'],'Swirlix':['Fairy'],
  'Dragalge':['Poison','Dragon'],
  'Tyrantrum':['Rock','Dragon'],'Tyrunt':['Rock','Dragon'],
  'Aurorus':['Rock','Ice'],'Amaura':['Rock','Ice'],
  'Inkay':['Dark','Psychic'],'Malamar':['Dark','Psychic'],
  'Barbaracle':['Rock','Water'],'Binacle':['Rock','Water'],
  'Clawitzer':['Water'],'Clauncher':['Water'],
  'Klefki':['Steel','Fairy'],
  'Dedenne':['Electric','Fairy'],
  'Gourgeist':['Ghost','Grass'],'Pumpkaboo':['Ghost','Grass'],
  'Heliolisk':['Electric','Normal'],'Helioptile':['Electric','Normal'],
  'Florges':['Fairy'],'Floette':['Fairy'],'Flabebe':['Fairy'],
  // Gen 7
  'Incineroar':['Fire','Dark'],'Torracat':['Fire'],'Litten':['Fire'],
  'Primarina':['Water','Fairy'],'Brionne':['Water','Fairy'],'Popplio':['Water'],
  'Decidueye':['Grass','Ghost'],'Dartrix':['Grass','Flying'],'Rowlet':['Grass','Flying'],
  'Vikavolt':['Bug','Electric'],'Charjabug':['Bug','Electric'],'Grubbin':['Bug'],
  'Ribombee':['Bug','Fairy'],'Cutiefly':['Bug','Fairy'],
  'Lycanroc':['Rock'],'Rockruff':['Rock'],
  'Araquanid':['Water','Bug'],'Dewpider':['Water','Bug'],
  'Lurantis':['Grass'],'Fomantis':['Grass'],
  'Shiinotic':['Grass','Fairy'],'Morelull':['Grass','Fairy'],
  'Salazzle':['Poison','Fire'],'Salandit':['Poison','Fire'],
  'Bewear':['Normal','Fighting'],'Stufful':['Normal','Fighting'],
  'Tsareena':['Grass'],'Steenee':['Grass'],'Bounsweet':['Grass'],
  'Comfey':['Fairy'],
  'Oranguru':['Normal','Psychic'],'Passimian':['Fighting'],
  'Golisopod':['Bug','Water'],'Wimpod':['Bug','Water'],
  'Palossand':['Ghost','Ground'],'Sandygast':['Ghost','Ground'],
  'Mimikyu':['Ghost','Fairy'],
  'Drampa':['Normal','Dragon'],
  'Togedemaru':['Electric','Steel'],
  'Bruxish':['Water','Psychic'],
  'Dhelmise':['Ghost','Grass'],
  'Kommo-o':['Dragon','Fighting'],'Hakamo-o':['Dragon','Fighting'],'Jangmo-o':['Dragon'],
  'Silvally':['Normal'],'Type-Null':['Normal'],
  'Tapu-Koko':['Electric','Fairy'],'Tapu-Lele':['Psychic','Fairy'],
  'Tapu-Bulu':['Grass','Fairy'],'Tapu-Fini':['Water','Fairy'],
  'Solgaleo':['Psychic','Steel'],'Lunala':['Psychic','Ghost'],
  'Nihilego':['Rock','Poison'],'Buzzwole':['Bug','Fighting'],
  'Pheromosa':['Bug','Fighting'],'Xurkitree':['Electric'],
  'Celesteela':['Steel','Flying'],'Kartana':['Grass','Steel'],
  'Guzzlord':['Dark','Dragon'],
  'Necrozma':['Psychic'],
  'Marshadow':['Fighting','Ghost'],'Zeraora':['Electric'],
  'Melmetal':['Steel'],'Meltan':['Steel'],
  'Ninetales-Alola':['Ice','Fairy'],'Vulpix-Alola':['Ice'],
  'Raichu-Alola':['Electric','Psychic'],
  'Sandshrew-Alola':['Ice','Steel'],'Sandslash-Alola':['Ice','Steel'],
  'Exeggutor-Alola':['Grass','Dragon'],
  'Marowak-Alola':['Fire','Ghost'],
  'Meowth-Alola':['Dark'],'Persian-Alola':['Dark'],
  'Geodude-Alola':['Rock','Electric'],'Graveler-Alola':['Rock','Electric'],'Golem-Alola':['Rock','Electric'],
  'Grimer-Alola':['Poison','Dark'],'Muk-Alola':['Poison','Dark'],
  // Gen 8
  'Rillaboom':['Grass'],'Thwackey':['Grass'],'Grookey':['Grass'],
  'Cinderace':['Fire'],'Raboot':['Fire'],'Scorbunny':['Fire'],
  'Inteleon':['Water'],'Drizzile':['Water'],'Sobble':['Water'],
  'Corviknight':['Flying','Steel'],'Corvisquire':['Flying','Steel'],'Rookidee':['Flying'],
  'Orbeetle':['Bug','Psychic'],'Dottler':['Bug','Psychic'],'Blipbug':['Bug'],
  'Thievul':['Dark'],'Nickit':['Dark'],
  'Eldegoss':['Grass'],'Gossifleur':['Grass'],
  'Drednaw':['Water','Rock'],'Chewtle':['Water'],
  'Boltund':['Electric'],'Yamper':['Electric'],
  'Coalossal':['Rock','Fire'],'Carkol':['Rock','Fire'],'Rolycoly':['Rock'],
  'Flapple':['Grass','Dragon'],'Appletun':['Grass','Dragon'],'Applin':['Grass','Dragon'],
  'Sandaconda':['Ground'],'Silicobra':['Ground'],
  'Toxtricity':['Electric','Poison'],'Toxel':['Electric','Poison'],
  'Centiskorch':['Fire','Bug'],'Sizzlipede':['Fire','Bug'],
  'Grapploct':['Fighting'],'Clobbopus':['Fighting'],
  'Sinistcha':['Grass','Ghost'],'Polteageist':['Ghost'],'Sinistea':['Ghost'],
  'Hatterene':['Psychic','Fairy'],'Hattrem':['Psychic','Fairy'],'Hatenna':['Psychic','Fairy'],
  'Grimmsnarl':['Dark','Fairy'],'Morgrem':['Dark','Fairy'],'Impidimp':['Dark','Fairy'],
  'Obstagoon':['Dark','Normal'],'Perrserker':['Steel'],
  'Cursola':['Ghost'],'Corsola-Galar':['Ghost'],
  'Runerigus':['Ground','Ghost'],'Yamask-Galar':['Ground','Ghost'],
  'Milcery':['Fairy'],'Alcremie':['Fairy'],
  'Falinks':['Fighting'],
  'Frosmoth':['Ice','Bug'],'Snom':['Ice','Bug'],
  'Stonjourner':['Rock'],'Eiscue':['Ice'],
  'Indeedee':['Psychic','Normal'],
  'Morpeko':['Electric','Dark'],
  'Copperajah':['Steel'],'Cufant':['Steel'],
  'Dracozolt':['Electric','Dragon'],'Arctozolt':['Electric','Ice'],
  'Dracovish':['Water','Dragon'],'Arctovish':['Water','Ice'],
  'Duraludon':['Steel','Dragon'],'Archaludon':['Steel','Dragon'],
  'Dragapult':['Dragon','Ghost'],'Drakloak':['Dragon','Ghost'],'Dreepy':['Dragon','Ghost'],
  'Zacian':['Fairy'],'Zamazenta':['Fighting'],'Eternatus':['Poison','Dragon'],
  'Kubfu':['Fighting'],'Urshifu':['Fighting','Dark'],
  'Urshifu-Single':['Fighting','Dark'],'Urshifu-Rapid-Strike':['Fighting','Water'],'Urshifu-Rapid':['Fighting','Water'],
  'Regieleki':['Electric'],'Regidrago':['Dragon'],
  'Glastrier':['Ice'],'Spectrier':['Ghost'],
  'Calyrex':['Psychic','Grass'],'Calyrex-Shadow':['Psychic','Ghost'],'Calyrex-Ice':['Psychic','Ice'],
  'Meowth-Galar':['Steel'],'Perrserker':['Steel'],
  'Ponyta-Galar':['Psychic'],'Rapidash-Galar':['Psychic','Fairy'],
  'Slowpoke-Galar':['Psychic'],'Slowbro-Galar':['Psychic','Poison'],'Slowking-Galar':['Poison','Psychic'],
  'Weezing-Galar':['Poison','Fairy'],
  'Mr-Mime-Galar':['Ice','Psychic'],'Mr-Rime':['Ice','Psychic'],
  'Darumaka-Galar':['Ice'],'Darmanitan-Galar':['Ice'],
  'Stunfisk-Galar':['Ground','Steel'],
  'Zigzagoon-Galar':['Dark','Normal'],'Linoone-Galar':['Dark','Normal'],'Obstagoon':['Dark','Normal'],
  'Farfetchd-Galar':['Fighting'],'Sirfetchd':['Fighting'],
  'Wyrdeer':['Normal','Psychic'],'Kleavor':['Bug','Rock'],
  'Ursaluna':['Ground','Normal'],
  'Basculegion':['Water','Ghost'],
  'Sneasler':['Fighting','Poison'],'Sneasel-Hisui':['Fighting','Poison'],
  'Overqwil':['Dark','Poison'],
  'Enamorus':['Fairy','Flying'],
  'Typhlosion-Hisui':['Fire','Ghost'],
  'Samurott-Hisui':['Water','Dark'],
  'Decidueye-Hisui':['Grass','Fighting'],
  'Braviary-Hisui':['Psychic','Flying'],
  'Zorua-Hisui':['Normal','Ghost'],'Zoroark-Hisui':['Normal','Ghost'],
  'Sliggoo-Hisui':['Steel','Dragon'],'Goodra-Hisui':['Steel','Dragon'],
  'Lilligant-Hisui':['Grass','Fighting'],
  'Voltorb-Hisui':['Electric','Grass'],'Electrode-Hisui':['Electric','Grass'],
  'Qwilfish-Hisui':['Dark','Poison'],
  'Avalugg-Hisui':['Ice','Rock'],
  // Gen 9
  'Meowscarada':['Grass','Dark'],'Floragato':['Grass'],'Sprigatito':['Grass'],
  'Skeledirge':['Fire','Ghost'],'Crocalor':['Fire'],'Fuecoco':['Fire'],
  'Quaquaval':['Water','Fighting'],'Quaxwell':['Water'],'Quaxly':['Water'],
  'Oinkologne':['Normal'],'Lechonk':['Normal'],
  'Lokix':['Bug','Dark'],'Nymble':['Bug'],
  'Pawmot':['Electric','Fighting'],'Pawmo':['Electric','Fighting'],'Pawmi':['Electric'],
  'Maushold':['Normal'],'Tandemaus':['Normal'],
  'Dachsbun':['Fairy'],'Fidough':['Fairy'],
  'Arboliva':['Grass','Normal'],'Dolliv':['Grass','Normal'],'Smoliv':['Grass','Normal'],
  'Garganacl':['Rock'],'Naclstack':['Rock'],'Nacli':['Rock'],
  'Armarouge':['Fire','Psychic'],'Charcadet':['Fire'],
  'Ceruledge':['Fire','Ghost'],
  'Bellibolt':['Electric'],'Tadbulb':['Electric'],
  'Kilowattrel':['Electric','Flying'],'Wattrel':['Electric','Flying'],
  'Mabosstiff':['Dark'],'Maschiff':['Dark'],
  'Grafaiai':['Poison','Normal'],'Shroodle':['Poison','Normal'],
  'Brambleghast':['Grass','Ghost'],'Bramblin':['Grass','Ghost'],
  'Toedscruel':['Ground','Grass'],'Toedscool':['Ground','Grass'],
  'Klawf':['Rock'],
  'Scovillain':['Grass','Fire'],'Capsakid':['Grass'],
  'Rabsca':['Bug','Psychic'],'Rellor':['Bug'],
  'Espathra':['Psychic'],'Flittle':['Psychic'],
  'Tinkaton':['Fairy','Steel'],'Tinkatuff':['Fairy','Steel'],'Tinkatink':['Fairy','Steel'],
  'Wugtrio':['Water'],'Wiglett':['Water'],
  'Palafin':['Water'],'Finizen':['Water'],
  'Revavroom':['Steel','Poison'],'Varoom':['Steel','Poison'],
  'Cyclizar':['Dragon','Normal'],
  'Orthworm':['Steel'],
  'Glimmora':['Rock','Poison'],'Glimmet':['Rock','Poison'],
  'Houndstone':['Ghost'],'Greavard':['Ghost'],
  'Flamigo':['Flying','Fighting'],
  'Cetitan':['Ice'],'Cetoddle':['Ice'],
  'Veluza':['Water','Psychic'],
  'Dondozo':['Water'],
  'Tatsugiri':['Dragon','Water'],
  'Annihilape':['Fighting','Ghost'],
  'Clodsire':['Poison','Ground'],
  'Farigiraf':['Normal','Psychic'],
  'Dudunsparce':['Normal'],
  'Kingambit':['Dark','Steel'],
  'Great-Tusk':['Ground','Fighting'],'Scream-Tail':['Fairy','Psychic'],
  'Brute-Bonnet':['Grass','Dark'],'Flutter-Mane':['Ghost','Fairy'],
  'Slither-Wing':['Bug','Fighting'],'Sandy-Shocks':['Electric','Ground'],
  'Iron-Treads':['Ground','Steel'],'Iron-Bundle':['Ice','Water'],
  'Iron-Hands':['Fighting','Electric'],'Iron-Jugulis':['Dark','Flying'],
  'Iron-Moth':['Fire','Poison'],'Iron-Thorns':['Rock','Electric'],
  'Baxcalibur':['Dragon','Ice'],'Arctibax':['Dragon','Ice'],'Frigibax':['Dragon','Ice'],
  'Gholdengo':['Steel','Ghost'],'Gimmighoul':['Ghost'],
  'Wo-Chien':['Dark','Grass'],'Chien-Pao':['Dark','Ice'],
  'Ting-Lu':['Dark','Ground'],'Chi-Yu':['Dark','Fire'],
  'Roaring-Moon':['Dragon','Dark'],'Iron-Valiant':['Fairy','Fighting'],
  'Koraidon':['Fighting','Dragon'],'Miraidon':['Electric','Dragon'],
  'Walking-Wake':['Water','Dragon'],'Iron-Leaves':['Grass','Psychic'],
  'Dipplin':['Grass','Dragon'],'Poltchageist':['Grass','Ghost'],'Sinistcha':['Grass','Ghost'],
  'Ogerpon':['Grass'],
  'Archaludon':['Steel','Dragon'],
  'Hydrapple':['Grass','Dragon'],
  'Gouging-Fire':['Fire','Dragon'],'Raging-Bolt':['Electric','Dragon'],
  'Iron-Boulder':['Rock','Psychic'],'Iron-Crown':['Steel','Psychic'],
  'Terapagos':['Normal'],
  // Mega forms
  'Altaria-Mega':['Dragon','Fairy'],
  'Dragonite-Mega':['Dragon','Flying'],
  'Houndoom-Mega':['Dark','Fire'],
  'Drampa-Mega':['Normal','Dragon'],
  'Kangaskhan-Mega':['Normal'],
  'Gyarados-Mega':['Water','Dark'],
  'Charizard-Mega-X':['Fire','Dragon'],'Charizard-Mega-Y':['Fire','Flying'],
  'Blaziken-Mega':['Fire','Fighting'],
  'Gardevoir-Mega':['Psychic','Fairy'],
  'Salamence-Mega':['Dragon','Flying'],
  'Metagross-Mega':['Steel','Psychic'],
  'Lopunny-Mega':['Normal','Fighting'],
  'Scizor-Mega':['Bug','Steel'],
  'Heracross-Mega':['Bug','Fighting'],
  'Tyranitar-Mega':['Rock','Dark'],
  'Aggron-Mega':['Steel'],
  'Medicham-Mega':['Fighting','Psychic'],
  'Absol-Mega':['Dark'],
  'Gengar-Mega':['Ghost','Poison'],
  'Alakazam-Mega':['Psychic'],
  'Ampharos-Mega':['Electric','Dragon'],
  'Lucario-Mega':['Fighting','Steel'],
  'Abomasnow-Mega':['Grass','Ice'],
  'Mawile-Mega':['Steel','Fairy'],
  'Sableye-Mega':['Dark','Ghost'],
  'Manectric-Mega':['Electric'],
  // Misc
  'Flutter Mane':['Ghost','Fairy'],
  'Pelipper':['Water','Flying'],
  'Whimsicott':['Grass','Fairy'],
  'Sinistcha':['Grass','Ghost'],
  'Sableye':['Dark','Ghost'],
  'Basculegion':['Water','Ghost'],
  'Liepard':['Dark'],
  'Orthworm':['Steel'],
  'Sneasler':['Fighting','Poison'],
  'Excadrill':['Ground','Steel'],
  'Tyranitar':['Rock','Dark'],
  'Dragapult':['Dragon','Ghost'],
  'Meganium':['Grass'],
  'Charizard':['Fire','Flying'],
  'Venusaur':['Grass','Poison'],
  'Cofagrigus':['Ghost'],
  'Cresselia':['Psychic'],
  'Gothitelle':['Psychic'],
  'Dusclops':['Ghost'],
  'Hatterene':['Psychic','Fairy'],
  'Farigiraf':['Normal','Psychic'],
  'Torkoal':['Fire'],
};

function getSpriteUrl(name) {
  // Direct lookup in expanded dex map
  const num = DEX_NUM_MAP[name];
  if (num) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png`;
  // Fallback: slugify and hit PokeAPI (async resolution via onerror)
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/-(mega|alola|galar|hisui)$/i, '').replace(/^-|-$/g, '');
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${slug}.png`;
}

// ============================================================
// TEAM DEFINITIONS
// ============================================================

const TEAMS = {
  "player": {
    "name": "TR Counter Squad",
    "label": "YOUR TEAM",
    "style": "speed",
    "description": "Fast offensive pressure with Intimidate + Will-O-Wisp support. Built to break Trick Room before it starts.",
    "champion_pack_id": "player_tr_counter_v1",
    "format": "sv",
    "formatid": "gen9vgc2024regh",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "user-authored",
        "spread_source": "user-authored",
        "author": "user",
        "url": "",
        "status": "unproven"
    },
    "legality_status": "legal",
    "legality_notes": "SV-format team validated under gen9vgc2024regh. Slot-6 duplicate Garchomp replaced with Dragapult-Scarf in T7 to resolve Species Clause.",
    "assumption_register": [
        "Team is SV-format; validated against gen9vgc rules, not Champions Reg M-A.",
        "Dragapult slot is SV-legal and also Champions Reg M-A legal (not restricted/paradox)."
    ],
    "members": [
      {
        "name": "Incineroar",
        "item": "Sitrus Berry",
        "ability": "Intimidate",
        "nature": "Adamant",
        "level": 50,
        "evs": {
          "hp": 244,
          "atk": 68,
          "def": 0,
          "spa": 0,
          "spd": 36,
          "spe": 12
        },
        "moves": [
          "Fake Out",
          "Flare Blitz",
          "Parting Shot",
          "Knock Off"
        ],
        "role": "Support / Pivot"
      },
      {
        "name": "Arcanine",
        "item": "Life Orb",
        "ability": "Intimidate",
        "nature": "Adamant",
        "level": 50,
        "evs": {
          "hp": 4,
          "atk": 252,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Power Gem",
          "Head Smash",
          "Extreme Speed",
          "Will-O-Wisp"
        ],
        "role": "TR Breaker / Speed Control"
      },
      {
        "name": "Garchomp",
        "item": "Rocky Helmet",
        "ability": "Rough Skin",
        "nature": "Jolly",
        "level": 50,
        "evs": {
          "hp": 4,
          "atk": 252,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Earthquake",
          "Dragon Claw",
          "Rock Slide",
          "Protect"
        ],
        "role": "Physical Sweeper"
      },
      {
        "name": "Whimsicott",
        "item": "Focus Sash",
        "ability": "Prankster",
        "nature": "Timid",
        "level": 50,
        "evs": {
          "hp": 4,
          "atk": 0,
          "def": 0,
          "spa": 252,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Tailwind",
          "Sunny Day",
          "Moonblast",
          "Protect"
        ],
        "role": "Speed Control"
      },
      {
        "name": "Rotom-Wash",
        "item": "Leftovers",
        "ability": "Levitate",
        "nature": "Bold",
        "level": 50,
        "evs": {
          "hp": 244,
          "atk": 0,
          "def": 52,
          "spa": 212,
          "spd": 0,
          "spe": 0
        },
        "moves": [
          "Thunderbolt",
          "Hydro Pump",
          "Will-O-Wisp",
          "Protect"
        ],
        "role": "Spread Check"
      },
      {
        "name": "Dragapult",
        "item": "Choice Scarf",
        "ability": "Clear Body",
        "teraType": "Fairy",
        "nature": "Jolly",
        "level": 50,
        "evs": {
          "hp": 4,
          "atk": 252,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Dragon Darts",
          "U-turn",
          "Tera Blast",
          "Sucker Punch"
        ],
        "role": "Speed Control / Scarf Revenge"
      }
    ]
  },
  "mega_altaria": {
    "name": "Mega Altaria",
    "label": "HYBRID RAINBOW",
    "style": "weather_support",
    "format": "gen9championsvgc2026regma",
    "description": "Sun-rain hybrid with Trick Room threat via Sinistcha. Prankster Whimsicott provides flexible speed control.",
    "champion_pack_id": "mega_altaria_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "https://pokepast.es/dfdfa66d317cf9d7",
        "spread_source": "https://pokepast.es/dfdfa66d317cf9d7",
        "author": "community",
        "url": "https://pokepast.es/dfdfa66d317cf9d7",
        "status": "exact"
    },
    "legality_status": "legal",
    "legality_notes": "Remove invented gen9championsvgc2026regma tag in T10.",
    "assumption_register": [],
    "members": [
      {
        "name": "Typhlosion-Hisui",
        "item": "Choice Scarf",
        "ability": "Frisk",
        "nature": "Timid",
        "evs": {
          "hp": 2,
          "atk": 0,
          "def": 32,
          "spa": 32,
          "spd": 0,
          "spe": 32
        },
        "moves": [
          "Eruption",
          "Heat Wave",
          "Focus Blast",
          "Shadow Ball"
        ],
        "role": "Scarfer"
      },
      {
        "name": "Altaria-Mega",
        "item": "Altarianite",
        "ability": "Cloud Nine",
        "nature": "Modest",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 0,
          "spa": 10,
          "spd": 17,
          "spe": 7
        },
        "moves": [
          "Protect",
          "Roost",
          "Flamethrower",
          "Hyper Voice"
        ],
        "role": "Mega Sweeper"
      },
      {
        "name": "Whimsicott",
        "item": "Focus Sash",
        "ability": "Prankster",
        "nature": "Serious",
        "evs": {
          "hp": 1,
          "atk": 0,
          "def": 1,
          "spa": 32,
          "spd": 0,
          "spe": 32
        },
        "moves": [
          "Protect",
          "Sunny Day",
          "Tailwind",
          "Moonblast"
        ],
        "role": "Speed Control"
      },
      {
        "name": "Rotom-Wash",
        "item": "Leftovers",
        "ability": "Levitate",
        "nature": "Modest",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 10,
          "spa": 23,
          "spd": 0,
          "spe": 1
        },
        "moves": [
          "Protect",
          "Will-O-Wisp",
          "Thunderbolt",
          "Hydro Pump"
        ],
        "role": "Spread Attacker"
      },
      {
        "name": "Sableye",
        "item": "Black Glasses",
        "ability": "Prankster",
        "nature": "Calm",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 8,
          "spa": 0,
          "spd": 26,
          "spe": 0
        },
        "moves": [
          "Reflect",
          "Light Screen",
          "Recover",
          "Foul Play"
        ],
        "role": "Screen Setter"
      },
      {
        "name": "Sinistcha",
        "item": "Sitrus Berry",
        "ability": "Hospitality",
        "nature": "Bold",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 30,
          "spa": 1,
          "spd": 1,
          "spe": 2
        },
        "moves": [
          "Trick Room",
          "Life Dew",
          "Rage Powder",
          "Matcha Gotcha"
        ],
        "role": "TR Setter"
      }
    ]
  },
  "mega_dragonite": {
    "name": "Mega Dragonite",
    "label": "HYBRID RAINBOW",
    "style": "rain",
    "format": "gen9championsvgc2026regma",
    "description": "Rain team with Mega Dragonite as the primary sweeper. Basculegion Adaptability + Archaludon Electro Shot under rain.",
    "champion_pack_id": "mega_dragonite_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "https://pokepast.es/dd101585183c9ed6",
        "spread_source": "https://pokepast.es/dd101585183c9ed6",
        "author": "community",
        "url": "https://pokepast.es/dd101585183c9ed6",
        "status": "unproven"
    },
    "legality_status": "legal",
    "legality_notes": "Mega Dragonite is a new Champions-introduced Mega Evolution (Dragoninite, Shop: 2000 VP). Legal in Reg M-A. Source: Game8 Items List; Victory Road Reg M-A.",
    "assumption_register": [
        "Dragonite Mega form verified via Game8 Items List and Victory Road Reg M-A docs.",
        "Mega activation consumes team's once-per-match Mega slot."
    ],
    "members": [
      {
        "name": "Dragonite-Mega",
        "item": "Dragoninite",
        "ability": "Multiscale",
        "nature": "Modest",
        "evs": {
          "hp": 26,
          "atk": 0,
          "def": 0,
          "spa": 32,
          "spd": 0,
          "spe": 8
        },
        "moves": [
          "Protect",
          "Ice Beam",
          "Thunder",
          "Hurricane"
        ],
        "role": "Mega Sweeper"
      },
      {
        "name": "Basculegion",
        "item": "Choice Scarf",
        "ability": "Adaptability",
        "nature": "Jolly",
        "evs": {
          "hp": 0,
          "atk": 32,
          "def": 2,
          "spa": 0,
          "spd": 0,
          "spe": 32
        },
        "moves": [
          "Wave Crash",
          "Aqua Jet",
          "Flip Turn",
          "Last Respects"
        ],
        "role": "Scarfer"
      },
      {
        "name": "Liepard",
        "item": "Focus Sash",
        "ability": "Prankster",
        "nature": "Serious",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 1,
          "spa": 0,
          "spd": 1,
          "spe": 32
        },
        "moves": [
          "Fake Out",
          "Rain Dance",
          "Thunder Wave",
          "Foul Play"
        ],
        "role": "Support"
      },
      {
        "name": "Archaludon",
        "item": "Quick Claw",
        "ability": "Sturdy",
        "nature": "Timid",
        "evs": {
          "hp": 1,
          "atk": 0,
          "def": 0,
          "spa": 32,
          "spd": 1,
          "spe": 32
        },
        "moves": [
          "Protect",
          "Flash Cannon",
          "Dragon Pulse",
          "Electro Shot"
        ],
        "role": "Rain Abuser"
      },
      {
        "name": "Pelipper",
        "item": "Leftovers",
        "ability": "Drizzle",
        "nature": "Modest",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 0,
          "spa": 5,
          "spd": 29,
          "spe": 0
        },
        "moves": [
          "Protect",
          "Tailwind",
          "U-turn",
          "Weather Ball"
        ],
        "role": "Rain Setter"
      },
      {
        "name": "Orthworm",
        "item": "Sitrus Berry",
        "ability": "Earth Eater",
        "nature": "Careful",
        "evs": {
          "hp": 31,
          "atk": 1,
          "def": 1,
          "spa": 0,
          "spd": 32,
          "spe": 1
        },
        "moves": [
          "Protect",
          "Helping Hand",
          "Shed Tail",
          "Iron Head"
        ],
        "role": "Support"
      }
    ]
  },
  "mega_houndoom": {
    "name": "Mega Houndoom",
    "label": "HYBRID RAINBOW",
    "style": "sun_tr",
    "format": "gen9championsvgc2026regma",
    "description": "Sun + Trick Room hybrid. Mega Houndoom Solar Power nukes under sun. Flexible TR setters in Sinistcha, Farigiraf, Whimsicott.",
    "champion_pack_id": "mega_houndoom_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "https://pokepast.es/4a87b07998f6c0c4",
        "spread_source": "https://pokepast.es/4a87b07998f6c0c4",
        "author": "community",
        "url": "https://pokepast.es/4a87b07998f6c0c4",
        "status": "unproven"
    },
    "legality_status": "legal",
    "legality_notes": "Mega Houndoom (Houndoominite, Gen 6 classic) plus secondary Drampa with Drampanite (new Champions Mega). Both Mega Stones legal; only one can activate per match per Reg M-A rules. Item Clause satisfied: Houndoominite != Drampanite.",
    "assumption_register": [
        "Team carries two Mega Stones; only one activation per match per Reg M-A rules.",
        "Item Clause satisfied: Houndoominite and Drampanite are distinct items.",
        "Drampa Mega form verified via Game8 Items List."
    ],
    "members": [
      {
        "name": "Houndoom-Mega",
        "item": "Houndoominite",
        "ability": "Solar Power",
        "nature": "Timid",
        "evs": {
          "hp": 1,
          "atk": 0,
          "def": 0,
          "spa": 32,
          "spd": 1,
          "spe": 32
        },
        "moves": [
          "Protect",
          "Scorching Sands",
          "Dark Pulse",
          "Heat Wave"
        ],
        "role": "Mega Sweeper"
      },
      {
        "name": "Torkoal",
        "item": "Charcoal",
        "ability": "Drought",
        "nature": "Quiet",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 1,
          "spa": 32,
          "spd": 1,
          "spe": 0
        },
        "moves": [
          "Protect",
          "Helping Hand",
          "Heat Wave",
          "Eruption"
        ],
        "role": "Sun Setter"
      },
      {
        "name": "Whimsicott",
        "item": "Focus Sash",
        "ability": "Prankster",
        "nature": "Modest",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 0,
          "spa": 32,
          "spd": 1,
          "spe": 1
        },
        "moves": [
          "Trick Room",
          "Tailwind",
          "Sunny Day",
          "Moonblast"
        ],
        "role": "TR/Speed Control"
      },
      {
        "name": "Farigiraf",
        "item": "Mental Herb",
        "ability": "Armor Tail",
        "nature": "Relaxed",
        "evs": {
          "hp": 26,
          "atk": 0,
          "def": 20,
          "spa": 1,
          "spd": 19,
          "spe": 0
        },
        "moves": [
          "Trick Room",
          "Helping Hand",
          "Psychic Noise",
          "Hyper Voice"
        ],
        "role": "TR Setter"
      },
      {
        "name": "Sinistcha",
        "item": "Sitrus Berry",
        "ability": "Hospitality",
        "nature": "Bold",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 31,
          "spa": 1,
          "spd": 1,
          "spe": 1
        },
        "moves": [
          "Trick Room",
          "Rage Powder",
          "Life Dew",
          "Matcha Gotcha"
        ],
        "role": "TR Setter"
      },
      {
        "name": "Drampa-Mega",
        "item": "Drampanite",
        "ability": "Cloud Nine",
        "nature": "Quiet",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 2,
          "spa": 32,
          "spd": 0,
          "spe": 0
        },
        "moves": [
          "Draco Meteor",
          "Hyper Voice",
          "Heat Wave",
          "Thunderbolt"
        ],
        "role": "Mega Sweeper"
      }
    ]
  },
  "rin_sand": {
    "name": "Rin Sand",
    "label": "RIN",
    "style": "sand",
    "description": "Sand offense with Tyranitar + Excadrill core. Sneasler Unburden for burst speed. Dragapult for speed and spread.",
    "champion_pack_id": "rin_sand_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "https://pokepast.es/e97ac67f1ce79c33",
        "spread_source": "https://pokepast.es/e97ac67f1ce79c33",
        "author": "community",
        "url": "https://pokepast.es/e97ac67f1ce79c33",
        "status": "unproven"
    },
    "legality_status": "legal",
    "legality_notes": "Mega Meganium is a new Champions-introduced Mega Evolution (Meganiumite, Shop: 2000 VP or Battle Pass M-1 reward). Legal in Reg M-A. Source: Game8 Items List.",
    "assumption_register": [
        "Meganium Mega form verified via Game8 Items List.",
        "Mega activation consumes team's once-per-match Mega slot."
    ],
    "members": [
      {
        "name": "Sneasler",
        "item": "White Herb",
        "ability": "Unburden",
        "nature": "Jolly",
        "evs": {
          "hp": 6,
          "atk": 24,
          "def": 3,
          "spa": 0,
          "spd": 1,
          "spe": 32
        },
        "moves": [
          "Close Combat",
          "Dire Claw",
          "Protect",
          "Fake Out"
        ],
        "role": "Unburden Attacker"
      },
      {
        "name": "Tyranitar",
        "item": "Chople Berry",
        "ability": "Sand Stream",
        "nature": "Adamant",
        "evs": {
          "hp": 32,
          "atk": 16,
          "def": 12,
          "spa": 0,
          "spd": 2,
          "spe": 4
        },
        "tera": "Rock",
        "moves": [
          "Rock Slide",
          "Knock Off",
          "Protect",
          "Ice Punch"
        ],
        "role": "Sand Setter"
      },
      {
        "name": "Rotom-Wash",
        "item": "Sitrus Berry",
        "ability": "Levitate",
        "nature": "Modest",
        "evs": {
          "hp": 31,
          "atk": 0,
          "def": 1,
          "spa": 5,
          "spd": 17,
          "spe": 12
        },
        "tera": "Electric",
        "moves": [
          "Thunderbolt",
          "Hydro Pump",
          "Protect",
          "Volt Switch"
        ],
        "role": "Pivot"
      },
      {
        "name": "Excadrill",
        "item": "Focus Sash",
        "ability": "Sand Rush",
        "nature": "Jolly",
        "evs": {
          "hp": 0,
          "atk": 32,
          "def": 1,
          "spa": 0,
          "spd": 1,
          "spe": 32
        },
        "tera": "Ground",
        "moves": [
          "High Horsepower",
          "Iron Head",
          "Protect",
          "Earthquake"
        ],
        "role": "Sand Rush Sweeper"
      },
      {
        "name": "Dragapult",
        "item": "Colbur Berry",
        "ability": "Clear Body",
        "nature": "Jolly",
        "evs": {
          "hp": 2,
          "atk": 32,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 32
        },
        "tera": "Dragon",
        "moves": [
          "Dragon Darts",
          "Phantom Force",
          "Protect",
          "Will-O-Wisp"
        ],
        "role": "Fast Attacker"
      },
      {
        "name": "Meganium",
        "item": "Meganiumite",
        "ability": "Overgrow",
        "nature": "Modest",
        "evs": {
          "hp": 26,
          "atk": 0,
          "def": 0,
          "spa": 32,
          "spd": 0,
          "spe": 8
        },
        "tera": "Fighting",
        "moves": [
          "Solar Beam",
          "Dazzling Gleam",
          "Protect",
          "Weather Ball"
        ],
        "role": "Mega Support"
      }
    ]
  },
  "suica_sun": {
    "name": "Suica Sun",
    "label": "SUICA",
    "style": "sun",
    "description": "Charizard Y sun offense. Sneasler + Basculegion revenge killers. Incineroar provides Intimidate support.",
    "champion_pack_id": "suica_sun_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "https://pokepast.es/cb48d8b06c73d33b",
        "spread_source": "https://pokepast.es/cb48d8b06c73d33b",
        "author": "community",
        "url": "https://pokepast.es/cb48d8b06c73d33b",
        "status": "exact"
    },
    "legality_status": "legal",
    "legality_notes": "",
    "assumption_register": [],
    "members": [
      {
        "name": "Charizard",
        "item": "Charizardite Y",
        "ability": "Blaze",
        "nature": "Modest",
        "evs": {
          "hp": 6,
          "atk": 0,
          "def": 16,
          "spa": 31,
          "spd": 0,
          "spe": 13
        },
        "moves": [
          "Heat Wave",
          "Air Slash",
          "Weather Ball",
          "Protect"
        ],
        "role": "Mega Sweeper"
      },
      {
        "name": "Sneasler",
        "item": "White Herb",
        "ability": "Unburden",
        "nature": "Adamant",
        "evs": {
          "hp": 0,
          "atk": 32,
          "def": 2,
          "spa": 0,
          "spd": 0,
          "spe": 32
        },
        "moves": [
          "Close Combat",
          "Dire Claw",
          "Rock Slide",
          "Protect"
        ],
        "role": "Physical Sweeper"
      },
      {
        "name": "Basculegion",
        "item": "Choice Scarf",
        "ability": "Adaptability",
        "nature": "Jolly",
        "evs": {
          "hp": 0,
          "atk": 32,
          "def": 2,
          "spa": 0,
          "spd": 0,
          "spe": 32
        },
        "moves": [
          "Wave Crash",
          "Last Respects",
          "Aqua Jet",
          "Flip Turn"
        ],
        "role": "Scarfer"
      },
      {
        "name": "Garchomp",
        "item": "Haban Berry",
        "ability": "Rough Skin",
        "nature": "Adamant",
        "evs": {
          "hp": 24,
          "atk": 20,
          "def": 0,
          "spa": 0,
          "spd": 1,
          "spe": 21
        },
        "moves": [
          "Dragon Claw",
          "Earthquake",
          "Rock Slide",
          "Protect"
        ],
        "role": "Physical Sweeper"
      },
      {
        "name": "Incineroar",
        "item": "Sitrus Berry",
        "ability": "Intimidate",
        "nature": "Adamant",
        "evs": {
          "hp": 32,
          "atk": 5,
          "def": 7,
          "spa": 0,
          "spd": 16,
          "spe": 6
        },
        "moves": [
          "Throat Chop",
          "Flare Blitz",
          "Parting Shot",
          "Fake Out"
        ],
        "role": "Support"
      },
      {
        "name": "Venusaur",
        "item": "Focus Sash",
        "ability": "Chlorophyll",
        "nature": "Modest",
        "evs": {
          "hp": 0,
          "atk": 0,
          "def": 1,
          "spa": 32,
          "spd": 1,
          "spe": 32
        },
        "moves": [
          "Energy Ball",
          "Sludge Bomb",
          "Sleep Powder",
          "Earth Power"
        ],
        "role": "Sun Abuser"
      }
    ]
  },
  "cofagrigus_tr": {
    "name": "Cofagrigus TR",
    "label": "TRICK ROOM",
    "style": "trick_room",
    "description": "Classic Trick Room team. Cofagrigus + Sinistcha lead sets TR. Slow, powerful sweepers underneath.",
    "champion_pack_id": "cofagrigus_tr_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "community",
        "spread_source": "community",
        "author": "community",
        "url": "",
        "status": "assumed"
    },
    "legality_status": "legal",
    "legality_notes": "Flutter Mane (Paradox, banned in Reg M-A) replaced with Hatterene in T8. Team now passes Champions Reg M-A validation.",
    "assumption_register": [
        "Spreads inferred from meta norms, not a pinned paste."
    ],
    "members": [
      {
        "name": "Cofagrigus",
        "item": "Mental Herb",
        "ability": "Mummy",
        "nature": "Quiet",
        "evs": {
          "hp": 252,
          "atk": 0,
          "def": 4,
          "spa": 252,
          "spd": 0,
          "spe": 0
        },
        "moves": [
          "Trick Room",
          "Will-O-Wisp",
          "Shadow Ball",
          "Ally Switch"
        ],
        "role": "TR Setter"
      },
      {
        "name": "Sinistcha",
        "item": "Sitrus Berry",
        "ability": "Hospitality",
        "nature": "Quiet",
        "evs": {
          "hp": 252,
          "atk": 0,
          "def": 4,
          "spa": 252,
          "spd": 0,
          "spe": 0
        },
        "moves": [
          "Trick Room",
          "Matcha Gotcha",
          "Rage Powder",
          "Life Dew"
        ],
        "role": "TR Setter"
      },
      {
        "name": "Hatterene",
        "item": "Life Orb",
        "ability": "Magic Bounce",
        "nature": "Quiet",
        "evs": {
          "hp": 252,
          "atk": 0,
          "def": 0,
          "spa": 252,
          "spd": 4,
          "spe": 0
        },
        "moves": [
          "Psychic",
          "Dazzling Gleam",
          "Shadow Ball",
          "Protect"
        ],
        "role": "TR Sweeper"
      },
      {
        "name": "Cresselia",
        "item": "Leftovers",
        "ability": "Levitate",
        "nature": "Sassy",
        "evs": {
          "hp": 252,
          "atk": 0,
          "def": 128,
          "spa": 0,
          "spd": 128,
          "spe": 0
        },
        "moves": [
          "Trick Room",
          "Lunar Dance",
          "Psychic",
          "Helping Hand"
        ],
        "role": "TR + Revive"
      },
      {
        "name": "Dusclops",
        "item": "Eviolite",
        "ability": "Pressure",
        "nature": "Relaxed",
        "evs": {
          "hp": 252,
          "atk": 0,
          "def": 128,
          "spa": 0,
          "spd": 128,
          "spe": 0
        },
        "moves": [
          "Trick Room",
          "Will-O-Wisp",
          "Shadow Sneak",
          "Helping Hand"
        ],
        "role": "TR Support"
      },
      {
        "name": "Hatterene",
        "item": "Choice Specs",
        "ability": "Magic Bounce",
        "teraType": "Fire",
        "nature": "Quiet",
        "level": 50,
        "ivs": {
          "hp": 31,
          "atk": 31,
          "def": 31,
          "spa": 31,
          "spd": 31,
          "spe": 0
        },
        "evs": {
          "hp": 252,
          "atk": 0,
          "def": 4,
          "spa": 252,
          "spd": 0,
          "spe": 0
        },
        "moves": [
          "Dazzling Gleam",
          "Psychic",
          "Expanding Force",
          "Mystical Fire"
        ],
        "role": "TR Sweeper"
      }
    ]
  },
  "champions_arena_1st": {
    "name": "Hyungwoo Shin — Champions Arena",
    "label": "1ST CHAMPIONS ARENA",
    "style": "sun",
    "description": "Mega Charizard-Y Sun with Coil Milotic secret weapon. Champions Arena winner April 2026. Rental: SQMPYRW6BP",
    "champion_pack_id": "champions_arena_1st_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "Victory Road Champions Arena coverage",
        "spread_source": "Victory Road Champions Arena coverage",
        "author": "Hyungwoo Shin",
        "url": "https://victoryroad.pro/champions-regulations/",
        "status": "exact"
    },
    "legality_status": "legal",
    "legality_notes": "Champions Arena Winner.",
    "assumption_register": [],
    "members": [
      {
        "name": "Charizard-Mega-Y",
        "item": "Charizardite Y",
        "ability": "Drought",
        "nature": "Modest",
        "evs": {
          "hp": 6,
          "atk": 0,
          "def": 16,
          "spa": 30,
          "spd": 0,
          "spe": 14
        },
        "moves": [
          "Heat Wave",
          "Weather Ball",
          "Solar Beam",
          "Protect"
        ],
        "role": "Sun Setter / Spread Attacker"
      },
      {
        "name": "Milotic",
        "item": "Leftovers",
        "ability": "Competitive",
        "nature": "Bold",
        "evs": {
          "hp": 31,
          "atk": 0,
          "def": 21,
          "spa": 1,
          "spd": 12,
          "spe": 1
        },
        "moves": [
          "Muddy Water",
          "Coil",
          "Hypnosis",
          "Recover"
        ],
        "role": "Utility / Secret Weapon"
      },
      {
        "name": "Incineroar",
        "item": "Chople Berry",
        "ability": "Intimidate",
        "nature": "Serious",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 11,
          "spa": 0,
          "spd": 16,
          "spe": 7
        },
        "moves": [
          "Throat Chop",
          "Parting Shot",
          "Fake Out",
          "Flare Blitz"
        ],
        "role": "Support / Pivot"
      },
      {
        "name": "Sneasler",
        "item": "White Herb",
        "ability": "Unburden",
        "nature": "Adamant",
        "evs": {
          "hp": 2,
          "atk": 32,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 32
        },
        "moves": [
          "Fake Out",
          "Close Combat",
          "Dire Claw",
          "Protect"
        ],
        "role": "Unburden Sweeper"
      },
      {
        "name": "Garchomp",
        "item": "Sitrus Berry",
        "ability": "Rough Skin",
        "nature": "Adamant",
        "evs": {
          "hp": 24,
          "atk": 19,
          "def": 0,
          "spa": 0,
          "spd": 1,
          "spe": 22
        },
        "moves": [
          "Dragon Claw",
          "Rock Slide",
          "Earthquake",
          "Protect"
        ],
        "role": "Physical Sweeper"
      },
      {
        "name": "Venusaur",
        "item": "Focus Sash",
        "ability": "Chlorophyll",
        "nature": "Modest",
        "evs": {
          "hp": 2,
          "atk": 0,
          "def": 0,
          "spa": 32,
          "spd": 0,
          "spe": 32
        },
        "moves": [
          "Energy Ball",
          "Sludge Bomb",
          "Sleep Powder",
          "Protect"
        ],
        "role": "Chlorophyll Sweeper"
      }
    ]
  },
  "champions_arena_2nd": {
    "name": "Jorge Tabuyo — Champions Arena Finalist",
    "label": "2ND CHAMPIONS ARENA",
    "style": "balance",
    "description": "Double Mega Charizard-X + Tyranitar with Sinistcha TR fallback. Rental: P08QQ5NU9C",
    "champion_pack_id": "champions_arena_2nd_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "Victory Road Champions Arena coverage",
        "spread_source": "Victory Road Champions Arena coverage",
        "author": "Jorge Tabuyo",
        "url": "https://victoryroad.pro/champions-regulations/",
        "status": "exact"
    },
    "legality_status": "legal",
    "legality_notes": "Champions Arena Finalist.",
    "assumption_register": [],
    "members": [
      {
        "name": "Charizard-Mega-X",
        "item": "Charizardite X",
        "ability": "Tough Claws",
        "nature": "Adamant",
        "evs": {
          "hp": 14,
          "atk": 21,
          "def": 1,
          "spa": 0,
          "spd": 1,
          "spe": 29
        },
        "moves": [
          "Flare Blitz",
          "Dragon Claw",
          "Dragon Dance",
          "Protect"
        ],
        "role": "Setup Sweeper"
      },
      {
        "name": "Milotic",
        "item": "Leftovers",
        "ability": "Competitive",
        "nature": "Calm",
        "evs": {
          "hp": 29,
          "atk": 0,
          "def": 22,
          "spa": 1,
          "spd": 0,
          "spe": 14
        },
        "moves": [
          "Icy Wind",
          "Scald",
          "Protect",
          "Recover"
        ],
        "role": "Speed Control / Pivot"
      },
      {
        "name": "Sinistcha",
        "item": "Sitrus Berry",
        "ability": "Hospitality",
        "nature": "Bold",
        "evs": {
          "hp": 31,
          "atk": 0,
          "def": 5,
          "spa": 1,
          "spd": 29,
          "spe": 0
        },
        "moves": [
          "Matcha Gotcha",
          "Rage Powder",
          "Life Dew",
          "Trick Room"
        ],
        "role": "TR Setter / Redirect"
      },
      {
        "name": "Tyranitar-Mega",
        "item": "Tyranitarite",
        "ability": "Sand Stream",
        "nature": "Adamant",
        "evs": {
          "hp": 17,
          "atk": 26,
          "def": 1,
          "spa": 0,
          "spd": 1,
          "spe": 21
        },
        "moves": [
          "Rock Slide",
          "Crunch",
          "High Horsepower",
          "Protect"
        ],
        "role": "Sand Setter / Physical Attacker"
      },
      {
        "name": "Incineroar",
        "item": "Sitrus Berry",
        "ability": "Intimidate",
        "nature": "Adamant",
        "evs": {
          "hp": 30,
          "atk": 5,
          "def": 10,
          "spa": 0,
          "spd": 10,
          "spe": 11
        },
        "moves": [
          "Flare Blitz",
          "Throat Chop",
          "Fake Out",
          "Parting Shot"
        ],
        "role": "Support / Pivot"
      },
      {
        "name": "Sneasler",
        "item": "White Herb",
        "ability": "Unburden",
        "nature": "Adamant",
        "evs": {
          "hp": 0,
          "atk": 32,
          "def": 0,
          "spa": 0,
          "spd": 2,
          "spe": 32
        },
        "moves": [
          "Dire Claw",
          "Fake Out",
          "Close Combat",
          "Coaching"
        ],
        "role": "Unburden Sweeper"
      }
    ]
  },
  "champions_arena_3rd": {
    "name": "Juan Benítez — Champions Arena Top 3",
    "label": "3RD CHAMPIONS ARENA",
    "style": "sun",
    "description": "Mega Charizard-Y + Max Speed Kingambit tech. Prankster Whimsicott + Scarf Garchomp. Rental: KN6SNLGUPA",
    "champion_pack_id": "champions_arena_3rd_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "Victory Road Champions Arena coverage",
        "spread_source": "Victory Road Champions Arena coverage",
        "author": "Juan Benitez",
        "url": "https://victoryroad.pro/champions-regulations/",
        "status": "exact"
    },
    "legality_status": "legal",
    "legality_notes": "Champions Arena Top 3.",
    "assumption_register": [],
    "members": [
      {
        "name": "Charizard-Mega-Y",
        "item": "Charizardite Y",
        "ability": "Drought",
        "nature": "Timid",
        "evs": {
          "hp": 10,
          "atk": 0,
          "def": 5,
          "spa": 18,
          "spd": 1,
          "spe": 32
        },
        "moves": [
          "Protect",
          "Heat Wave",
          "Overheat",
          "Solar Beam"
        ],
        "role": "Sun Setter / Spread Attacker"
      },
      {
        "name": "Farigiraf",
        "item": "Sitrus Berry",
        "ability": "Armor Tail",
        "nature": "Modest",
        "evs": {
          "hp": 31,
          "atk": 0,
          "def": 12,
          "spa": 10,
          "spd": 13,
          "spe": 0
        },
        "moves": [
          "Psychic",
          "Imprison",
          "Trick Room",
          "Hyper Voice"
        ],
        "role": "TR Setter / Priority Blocker"
      },
      {
        "name": "Garchomp",
        "item": "Choice Scarf",
        "ability": "Rough Skin",
        "nature": "Adamant",
        "evs": {
          "hp": 2,
          "atk": 32,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 32
        },
        "moves": [
          "Earthquake",
          "Dragon Claw",
          "Rock Slide",
          "Stomping Tantrum"
        ],
        "role": "Speed Control / Sweeper"
      },
      {
        "name": "Whimsicott",
        "item": "Focus Sash",
        "ability": "Prankster",
        "nature": "Timid",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 10,
          "spa": 2,
          "spd": 0,
          "spe": 22
        },
        "moves": [
          "Protect",
          "Moonblast",
          "Tailwind",
          "Encore"
        ],
        "role": "Prankster Support"
      },
      {
        "name": "Sneasler",
        "item": "White Herb",
        "ability": "Unburden",
        "nature": "Adamant",
        "evs": {
          "hp": 8,
          "atk": 20,
          "def": 5,
          "spa": 0,
          "spd": 1,
          "spe": 32
        },
        "moves": [
          "Dire Claw",
          "Fake Out",
          "Close Combat",
          "Protect"
        ],
        "role": "Unburden Sweeper"
      },
      {
        "name": "Kingambit",
        "item": "Black Glasses",
        "ability": "Defiant",
        "nature": "Adamant",
        "evs": {
          "hp": 6,
          "atk": 25,
          "def": 2,
          "spa": 0,
          "spd": 1,
          "spe": 32
        },
        "moves": [
          "Kowtow Cleave",
          "Sucker Punch",
          "Low Kick",
          "Protect"
        ],
        "role": "Late-Game Sweeper"
      }
    ]
  },
  "chuppa_balance": {
    "name": "Chuppa Cross IV — Pittsburgh Champion",
    "label": "REGIONAL WINNER",
    "style": "balance",
    "description": "Adaptability Basculegion + Last Respects win-con. Pittsburgh Regional champion. Focus Sash + Maushold Follow Me.",
    "champion_pack_id": "chuppa_balance_sv_v1",
    "format": "sv",
    "formatid": "gen9vgc2024regh",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "community",
        "spread_source": "community",
        "author": "Chuppa Cross IV",
        "url": "",
        "status": "unproven"
    },
    "legality_status": "legal",
    "legality_notes": "SV-format. Fabricated 'Pittsburgh Regional' description removed in T10.",
    "assumption_register": [
        "Team attribution to Chuppa Cross IV not verified from a pinned source."
    ],
    "members": [
      {
        "name": "Basculegion",
        "item": "Focus Sash",
        "ability": "Adaptability",
        "nature": "Adamant",
        "evs": {
          "hp": 4,
          "atk": 252,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Liquidation",
          "Last Respects",
          "Aqua Jet",
          "Protect"
        ],
        "role": "Adaptability Sweeper"
      },
      {
        "name": "Maushold",
        "item": "Rocky Helmet",
        "ability": "Friend Guard",
        "nature": "Jolly",
        "evs": {
          "hp": 252,
          "atk": 0,
          "def": 4,
          "spa": 0,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Super Fang",
          "Feint",
          "Follow Me",
          "Protect"
        ],
        "role": "Redirection Support"
      },
      {
        "name": "Dragonite",
        "item": "Loaded Dice",
        "ability": "Multiscale",
        "nature": "Adamant",
        "evs": {
          "hp": 4,
          "atk": 252,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Scale Shot",
          "Tailwind",
          "Haze",
          "Protect"
        ],
        "role": "Tailwind + Multi-hit"
      },
      {
        "name": "Incineroar",
        "item": "Safety Goggles",
        "ability": "Intimidate",
        "nature": "Careful",
        "evs": {
          "hp": 252,
          "atk": 4,
          "def": 0,
          "spa": 0,
          "spd": 252,
          "spe": 0
        },
        "moves": [
          "Flare Blitz",
          "Knock Off",
          "Parting Shot",
          "Fake Out"
        ],
        "role": "Support / Pivot"
      },
      {
        "name": "Ursaluna-Bloodmoon",
        "item": "Assault Vest",
        "ability": "Mind's Eye",
        "nature": "Modest",
        "evs": {
          "hp": 252,
          "atk": 0,
          "def": 4,
          "spa": 252,
          "spd": 0,
          "spe": 0
        },
        "moves": [
          "Blood Moon",
          "Hyper Voice",
          "Earth Power",
          "Vacuum Wave"
        ],
        "role": "TR Sweeper / Tank"
      },
      {
        "name": "Gholdengo",
        "item": "Choice Specs",
        "ability": "Good as Gold",
        "nature": "Modest",
        "evs": {
          "hp": 4,
          "atk": 0,
          "def": 0,
          "spa": 252,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Make It Rain",
          "Shadow Ball",
          "Power Gem",
          "Trick"
        ],
        "role": "Status-Immune Attacker"
      }
    ]
  },
  "aurora_veil_froslass": {
    "name": "Mega Froslass — Aurora Veil",
    "label": "VEIL TEAM",
    "style": "veil",
    "description": "Mega Froslass Snow Warning sets instant Aurora Veil. Dragonite + Kingambit behind veil. High win-condition team.",
    "champion_pack_id": "aurora_veil_froslass_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "community",
        "spread_source": "community",
        "author": "community",
        "url": "",
        "status": "unproven"
    },
    "legality_status": "legal",
    "legality_notes": "Mega Froslass is a new Champions-introduced Mega Evolution (Froslassite, Shop: 2000 VP). Legal in Reg M-A. Source: Game8 Items List.",
    "assumption_register": [
        "Froslass Mega form verified via Game8 Items List.",
        "Mega activation consumes team's once-per-match Mega slot."
    ],
    "members": [
      {
        "name": "Froslass-Mega",
        "item": "Froslassite",
        "ability": "Snow Warning",
        "nature": "Timid",
        "evs": {
          "hp": 4,
          "atk": 0,
          "def": 0,
          "spa": 252,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Aurora Veil",
          "Blizzard",
          "Shadow Ball",
          "Protect"
        ],
        "role": "Veil Setter / Attacker"
      },
      {
        "name": "Dragonite",
        "item": "Lum Berry",
        "ability": "Multiscale",
        "nature": "Adamant",
        "evs": {
          "hp": 4,
          "atk": 252,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Extreme Speed",
          "Dragon Dance",
          "Fire Punch",
          "Protect"
        ],
        "role": "Multiscale Setup Sweeper"
      },
      {
        "name": "Kingambit",
        "item": "Chople Berry",
        "ability": "Supreme Overlord",
        "nature": "Adamant",
        "evs": {
          "hp": 4,
          "atk": 252,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Kowtow Cleave",
          "Sucker Punch",
          "Low Kick",
          "Protect"
        ],
        "role": "Supreme Overlord Sweeper"
      },
      {
        "name": "Milotic",
        "item": "Life Orb",
        "ability": "Competitive",
        "nature": "Modest",
        "evs": {
          "hp": 4,
          "atk": 0,
          "def": 0,
          "spa": 252,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Scald",
          "Ice Beam",
          "Life Dew",
          "Protect"
        ],
        "role": "Competitive Attacker"
      },
      {
        "name": "Incineroar",
        "item": "Sitrus Berry",
        "ability": "Intimidate",
        "nature": "Careful",
        "evs": {
          "hp": 252,
          "atk": 4,
          "def": 0,
          "spa": 0,
          "spd": 252,
          "spe": 0
        },
        "moves": [
          "Fake Out",
          "Parting Shot",
          "Flare Blitz",
          "Knock Off"
        ],
        "role": "Support / Pivot"
      },
      {
        "name": "Garchomp",
        "item": "Rocky Helmet",
        "ability": "Rough Skin",
        "nature": "Jolly",
        "evs": {
          "hp": 4,
          "atk": 252,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Earthquake",
          "Rock Slide",
          "Dragon Claw",
          "Protect"
        ],
        "role": "Physical Pressure"
      }
    ]
  },
  "kingambit_sneasler": {
    "name": "Kingambit + Sneasler Core",
    "label": "META CORE",
    "style": "offense",
    "description": "The #1 ranked meta core in Reg M-A. 1,329 teams tracked. Defiant Kingambit punishes Intimidate; Unburden Sneasler cleans up.",
    "champion_pack_id": "kingambit_sneasler_sv_v1",
    "format": "sv",
    "formatid": "gen9vgc2024regh",
    "gametype": "doubles",
    "ruleset": [
        "Species Clause",
        "Item Clause",
        "Bring 6 Pick 4",
        "Level 50"
    ],
    "provenance": {
        "roster_source": "community meta core",
        "spread_source": "community meta norms",
        "author": "community",
        "url": "",
        "status": "prior_filled"
    },
    "legality_status": "legal",
    "legality_notes": "SV-format meta core.",
    "assumption_register": [
        "Spreads are meta-typical, not pinned to a specific paste."
    ],
    "members": [
      {
        "name": "Kingambit",
        "item": "Black Glasses",
        "ability": "Defiant",
        "nature": "Adamant",
        "evs": {
          "hp": 4,
          "atk": 252,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Kowtow Cleave",
          "Sucker Punch",
          "Low Kick",
          "Protect"
        ],
        "role": "Primary Win Condition"
      },
      {
        "name": "Sneasler",
        "item": "White Herb",
        "ability": "Unburden",
        "nature": "Adamant",
        "evs": {
          "hp": 4,
          "atk": 252,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Fake Out",
          "Close Combat",
          "Dire Claw",
          "Protect"
        ],
        "role": "Unburden Sweeper"
      },
      {
        "name": "Incineroar",
        "item": "Sitrus Berry",
        "ability": "Intimidate",
        "nature": "Careful",
        "evs": {
          "hp": 252,
          "atk": 4,
          "def": 0,
          "spa": 0,
          "spd": 252,
          "spe": 0
        },
        "moves": [
          "Fake Out",
          "Parting Shot",
          "Flare Blitz",
          "Darkest Lariat"
        ],
        "role": "Intimidate Chain"
      },
      {
        "name": "Garchomp",
        "item": "Choice Scarf",
        "ability": "Rough Skin",
        "nature": "Jolly",
        "evs": {
          "hp": 4,
          "atk": 252,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 252
        },
        "moves": [
          "Earthquake",
          "Dragon Claw",
          "Rock Slide",
          "Stomping Tantrum"
        ],
        "role": "Speed Control"
      },
      {
        "name": "Amoonguss",
        "item": "Rocky Helmet",
        "ability": "Regenerator",
        "nature": "Bold",
        "evs": {
          "hp": 252,
          "atk": 0,
          "def": 252,
          "spa": 0,
          "spd": 4,
          "spe": 0
        },
        "moves": [
          "Spore",
          "Rage Powder",
          "Sludge Bomb",
          "Protect"
        ],
        "role": "Redirect / Sleep"
      },
      {
        "name": "Rotom-Wash",
        "item": "Leftovers",
        "ability": "Levitate",
        "nature": "Bold",
        "evs": {
          "hp": 244,
          "atk": 0,
          "def": 52,
          "spa": 212,
          "spd": 0,
          "spe": 0
        },
        "moves": [
          "Thunderbolt",
          "Hydro Pump",
          "Will-O-Wisp",
          "Protect"
        ],
        "role": "Utility / Status"
      }
    ]
  },
  "custom_1776995210260": {
    "name": "Froslass's Team",
    "label": "CUSTOM",
    "style": "custom",
    "description": "Imported via Showdown paste",
    "members": [
      {
        "name": "Froslass",
        "item": "Froslassite",
        "ability": "Snow Cloak",
        "level": 50,
        "nature": "Timid",
        "evs": {
          "hp": 2,
          "atk": 0,
          "def": 0,
          "spa": 32,
          "spd": 0,
          "spe": 32
        },
        "moves": [
          "Blizzard",
          "Shadow Ball",
          "Aurora Veil",
          "Protect"
        ],
        "role": "",
        "tera": null
      },
      {
        "name": "Glaceon",
        "item": "Shell Bell",
        "ability": "Ice Body",
        "level": 50,
        "nature": "Modest",
        "evs": {
          "hp": 0,
          "atk": 0,
          "def": 32,
          "spa": 32,
          "spd": 2,
          "spe": 0
        },
        "moves": [
          "Blizzard",
          "Freeze-Dry",
          "Protect",
          "Calm Mind"
        ],
        "role": "",
        "tera": null
      },
      {
        "name": "Ninetales-Alola",
        "item": "Focus Sash",
        "ability": "Snow Warning",
        "level": 50,
        "nature": "Modest",
        "evs": {
          "hp": 2,
          "atk": 0,
          "def": 0,
          "spa": 32,
          "spd": 0,
          "spe": 32
        },
        "moves": [
          "Aurora Veil",
          "Blizzard",
          "Moonblast",
          "Encore"
        ],
        "role": "",
        "tera": null
      },
      {
        "name": "Milotic",
        "item": "Leftovers",
        "ability": "Competitive",
        "level": 50,
        "nature": "Calm",
        "evs": {
          "hp": 0,
          "atk": 0,
          "def": 0,
          "spa": 32,
          "spd": 32,
          "spe": 2
        },
        "moves": [
          "Blizzard",
          "Scald",
          "Weather Ball",
          "Life Dew"
        ],
        "role": "",
        "tera": null
      },
      {
        "name": "Sneasler",
        "item": "Sitrus Berry",
        "ability": "Unburden",
        "level": 50,
        "nature": "Jolly",
        "evs": {
          "hp": 2,
          "atk": 32,
          "def": 0,
          "spa": 0,
          "spd": 0,
          "spe": 32
        },
        "moves": [
          "Fake Out",
          "Dire Claw",
          "Close Combat",
          "Rock Tomb"
        ],
        "role": "",
        "tera": null
      },
      {
        "name": "Farigiraf",
        "item": "Choice Scarf",
        "ability": "Cud Chew",
        "level": 50,
        "nature": "Modest",
        "evs": {
          "hp": 32,
          "atk": 0,
          "def": 0,
          "spa": 32,
          "spd": 2,
          "spe": 0
        },
        "moves": [
          "Hyper Voice",
          "Psychic",
          "Trick Room",
          "Protect"
        ],
        "role": "",
        "tera": null
      }
    ]
  },
  "perish_trap_gengar": {
    "name": "Perish Trap — Mega Gengar",
    "label": "PERISH TRAP",
    "style": "perish_trap",
    "description": "Mega Gengar Shadow Tag + Perish Song trap core. Sinistcha Rage Powder redirection stalls opponents through perish countdown. Francesco Rasini Champions Arena Top 12.",
    "champion_pack_id": "perish_trap_gengar_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
    "source": "preloaded",
    "origin": {
      "url": "https://www.vrpastes.com/s8hEJH9u",
      "player": "Francesco Rasini",
      "event": "The Champions Arena (Rank #12)"
    },
    "provenance": {
      "roster_source": "pikalytics_top_teams",
      "spread_source": "archetype_default",
      "author": "Francesco Rasini",
      "url": "https://www.vrpastes.com/s8hEJH9u",
      "status": "roster-verified-spreads-inferred"
    },
    "legality_status": "legal_inferred",
    "legality_notes": "Mega Gengar legal in Reg M-A via Gengarite. Shadow Tag + Perish Song legal. Source: Pikalytics + VR Pastes.",
    "assumption_register": [
      "Roster (species/items/abilities/moves) verified from open team list.",
      "EVs, natures, and Tera types not disclosed by source; archetype-default spreads applied.",
      "Mega activation consumes team's once-per-match Mega slot."
    ],
    "members": [
      {
        "name": "Gengar-Mega",
        "item": "Gengarite",
        "ability": "Shadow Tag",
        "nature": "Timid",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 0, "def": 0, "spa": 252, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Shadow Ball", "Sludge Bomb", "Perish Song", "Protect"],
        "tera": "Ghost",
        "role": "Mega Trapper"
      },
      {
        "name": "Kingambit",
        "item": "Black Glasses",
        "ability": "Defiant",
        "nature": "Adamant",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Kowtow Cleave", "Sucker Punch", "Low Kick", "Protect"],
        "tera": "Dark",
        "role": "Late-Game Sweeper"
      },
      {
        "name": "Sinistcha",
        "item": "Sitrus Berry",
        "ability": "Hospitality",
        "nature": "Relaxed",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 252, "spa": 4, "spd": 0, "spe": 0},
        "ev_source": "archetype_default",
        "ivs": { "hp":31, "atk":31, "def":31, "spa":31, "spd":31, "spe":0 },
        "moves": ["Matcha Gotcha", "Trick Room", "Rage Powder", "Protect"],
        "tera": "Dark",
        "role": "Redirection Support"
      },
      {
        "name": "Incineroar",
        "item": "Chople Berry",
        "ability": "Intimidate",
        "nature": "Careful",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 4, "def": 0, "spa": 0, "spd": 252, "spe": 0},
        "ev_source": "archetype_default",
        "moves": ["Flare Blitz", "Protect", "Parting Shot", "Fake Out"],
        "tera": "Ghost",
        "role": "Pivot / Fake Out"
      },
      {
        "name": "Kommo-o",
        "item": "Leftovers",
        "ability": "Overcoat",
        "nature": "Modest",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 0, "def": 0, "spa": 252, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Clanging Scales", "Aura Sphere", "Clangorous Soul", "Protect"],
        "tera": "Fairy",
        "role": "Late Cleaner"
      },
      {
        "name": "Aerodactyl",
        "item": "Focus Sash",
        "ability": "Unnerve",
        "nature": "Jolly",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Tailwind", "Dual Wingbeat", "Rock Slide", "Protect"],
        "tera": "Flying",
        "role": "Speed Control"
      }
    ]
  },
  "rain_offense": {
    "name": "Rain Offense — Mega Meganium",
    "label": "RAIN",
    "style": "rain_offense",
    "description": "Pelipper Drizzle + Basculegion Adaptability Wave Crash + Archaludon Electro Shot rain core. Mega Meganium (Mega Sol) secondary. leoscerni LIGA DA COMUNIDADE #2 Rank #3.",
    "champion_pack_id": "rain_offense_meganium_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
    "source": "preloaded",
    "origin": {
      "url": "https://play.limitlesstcg.com/tournament/69d18b350e548b5c2fbe3486/player/leoscerni/teamlist",
      "player": "leoscerni",
      "event": "LIGA DA COMUNIDADE #2 (Rank #3)"
    },
    "provenance": {
      "roster_source": "pikalytics_top_teams",
      "spread_source": "archetype_default",
      "author": "leoscerni",
      "url": "https://play.limitlesstcg.com/tournament/69d18b350e548b5c2fbe3486/player/leoscerni/teamlist",
      "status": "roster-verified-spreads-inferred"
    },
    "legality_status": "legal_inferred",
    "legality_notes": "Mega Meganium (new Champions Mega, Meganiumite) legal in Reg M-A. All other species standard. Source: Pikalytics Top Teams.",
    "assumption_register": [
      "Roster (species/items/abilities/moves) verified from open team list.",
      "EVs, natures, and Tera types not disclosed by source; archetype-default spreads applied.",
      "Mega activation consumes team's once-per-match Mega slot."
    ],
    "members": [
      {
        "name": "Meganium-Mega",
        "item": "Meganiumite",
        "ability": "Mega Sol",
        "nature": "Modest",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 0, "def": 0, "spa": 252, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Solar Beam", "Weather Ball", "Dazzling Gleam", "Protect"],
        "tera": "Fairy",
        "role": "Mega Attacker"
      },
      {
        "name": "Sableye",
        "item": "Lum Berry",
        "ability": "Prankster",
        "nature": "Calm",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 4, "spa": 0, "spd": 252, "spe": 0},
        "ev_source": "archetype_default",
        "moves": ["Foul Play", "Rain Dance", "Light Screen", "Encore"],
        "tera": "Normal",
        "role": "Prankster Support"
      },
      {
        "name": "Archaludon",
        "item": "Sitrus Berry",
        "ability": "Stamina",
        "nature": "Modest",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 0, "def": 0, "spa": 252, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Electro Shot", "Draco Meteor", "Flash Cannon", "Protect"],
        "tera": "Fairy",
        "role": "Rain SpA"
      },
      {
        "name": "Basculegion",
        "item": "Choice Scarf",
        "ability": "Adaptability",
        "nature": "Adamant",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Wave Crash", "Flip Turn", "Aqua Jet", "Last Respects"],
        "tera": "Ghost",
        "role": "Scarf Sweeper"
      },
      {
        "name": "Pelipper",
        "item": "Focus Sash",
        "ability": "Drizzle",
        "nature": "Modest",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 4, "spa": 252, "spd": 0, "spe": 0},
        "ev_source": "archetype_default",
        "moves": ["Weather Ball", "Hurricane", "Tailwind", "Protect"],
        "tera": "Ghost",
        "role": "Weather Setter"
      },
      {
        "name": "Sneasler",
        "item": "White Herb",
        "ability": "Unburden",
        "nature": "Jolly",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Close Combat", "Dire Claw", "Fake Out", "Protect"],
        "tera": "Stellar",
        "role": "Unburden Sweeper"
      }
    ]
  },
  "trick_room_golurk": {
    "name": "Trick Room — Mega Golurk",
    "label": "TRICK ROOM",
    "style": "trick_room",
    "description": "Farigiraf Armor Tail + Trick Room setter, Mega Golurk Iron Fist Headlong Rush sweeper, Torkoal Eruption cleanup. pokefey Torneo Salida Rank #2.",
    "champion_pack_id": "trick_room_golurk_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
    "source": "preloaded",
    "origin": {
      "url": "https://play.limitlesstcg.com/tournament/69d3c3270e548b5c2fbe4826/player/pokefey/teamlist",
      "player": "pokefey",
      "event": "Torneo Salida Pokemon Champions (Rank #2)"
    },
    "provenance": {
      "roster_source": "pikalytics_top_teams",
      "spread_source": "archetype_default",
      "author": "pokefey",
      "url": "https://play.limitlesstcg.com/tournament/69d3c3270e548b5c2fbe4826/player/pokefey/teamlist",
      "status": "roster-verified-spreads-inferred"
    },
    "legality_status": "legal_inferred",
    "legality_notes": "Mega Golurk legal in Reg M-A via Golurkite. Unseen Fist ability is updated in Champions (25% Protect bypass). Source: Pikalytics Top Teams.",
    "assumption_register": [
      "Roster (species/items/abilities/moves) verified from open team list.",
      "EVs, natures, and Tera types not disclosed by source; archetype-default spreads applied.",
      "Mega activation consumes team's once-per-match Mega slot."
    ],
    "members": [
      {
        "name": "Incineroar",
        "item": "Shuca Berry",
        "ability": "Intimidate",
        "nature": "Careful",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 4, "def": 0, "spa": 0, "spd": 252, "spe": 0},
        "ev_source": "archetype_default",
        "moves": ["Flare Blitz", "Throat Chop", "Parting Shot", "Fake Out"],
        "tera": "Fire",
        "role": "Pivot"
      },
      {
        "name": "Farigiraf",
        "item": "Sitrus Berry",
        "ability": "Armor Tail",
        "nature": "Relaxed",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 4, "spa": 252, "spd": 0, "spe": 0},
        "ev_source": "archetype_default",
        "ivs": { "hp":31, "atk":31, "def":31, "spa":31, "spd":31, "spe":0 },
        "moves": ["Hyper Voice", "Psychic", "Helping Hand", "Trick Room"],
        "tera": "Normal",
        "role": "TR Setter"
      },
      {
        "name": "Golurk-Mega",
        "item": "Golurkite",
        "ability": "Iron Fist",
        "nature": "Brave",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 4, "spa": 252, "spd": 0, "spe": 0},
        "ev_source": "archetype_default",
        "ivs": { "hp":31, "atk":31, "def":31, "spa":31, "spd":31, "spe":0 },
        "moves": ["Protect", "Headlong Rush", "Poltergeist", "Ice Punch"],
        "tera": "Ground",
        "role": "Mega TR Sweeper"
      },
      {
        "name": "Sneasler",
        "item": "White Herb",
        "ability": "Unburden",
        "nature": "Jolly",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Close Combat", "Dire Claw", "Fake Out", "Coaching"],
        "tera": "Fighting",
        "role": "Unburden"
      },
      {
        "name": "Torkoal",
        "item": "Charcoal",
        "ability": "Drought",
        "nature": "Quiet",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 4, "spa": 252, "spd": 0, "spe": 0},
        "ev_source": "archetype_default",
        "ivs": { "hp":31, "atk":31, "def":31, "spa":31, "spd":31, "spe":0 },
        "moves": ["Protect", "Heat Wave", "Eruption", "Weather Ball"],
        "tera": "Fire",
        "role": "TR Attacker"
      },
      {
        "name": "Venusaur",
        "item": "Focus Sash",
        "ability": "Chlorophyll",
        "nature": "Modest",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 0, "def": 0, "spa": 252, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Protect", "Leaf Storm", "Sludge Bomb", "Sleep Powder"],
        "tera": "Grass",
        "role": "Sun Abuser / Sash"
      }
    ]
  },
  "sun_offense_charizard": {
    "name": "Sun Offense — Mega Charizard Y",
    "label": "SUN",
    "style": "sun_offense",
    "description": "Mega Charizard Y Drought + Torkoal Eruption + Hatterene/Farigiraf Trick Room hybrid. Jiang Jin-Hao Champions Arena Top 5.",
    "champion_pack_id": "sun_offense_charizard_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
    "source": "preloaded",
    "origin": {
      "url": "https://www.vrpastes.com/y1F6tzNe",
      "player": "Jiang Jin-Hao",
      "event": "The Champions Arena (Rank #5)"
    },
    "provenance": {
      "roster_source": "pikalytics_top_teams",
      "spread_source": "archetype_default",
      "author": "Jiang Jin-Hao",
      "url": "https://www.vrpastes.com/y1F6tzNe",
      "status": "roster-verified-spreads-inferred"
    },
    "legality_status": "legal_inferred",
    "legality_notes": "Mega Charizard Y legal in Reg M-A. Standard sun core + TR fallback. Source: Pikalytics + VR Pastes.",
    "assumption_register": [
      "Roster (species/items/abilities/moves) verified from open team list.",
      "EVs, natures, and Tera types not disclosed by source; archetype-default spreads applied.",
      "Mega activation consumes team's once-per-match Mega slot."
    ],
    "members": [
      {
        "name": "Incineroar",
        "item": "White Herb",
        "ability": "Intimidate",
        "nature": "Adamant",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 4, "def": 0, "spa": 0, "spd": 252, "spe": 0},
        "ev_source": "archetype_default",
        "moves": ["Flare Blitz", "Darkest Lariat", "Close Combat", "Fake Out"],
        "tera": "Fire",
        "role": "Pivot"
      },
      {
        "name": "Hatterene",
        "item": "Fairy Feather",
        "ability": "Magic Bounce",
        "nature": "Relaxed",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 4, "spa": 252, "spd": 0, "spe": 0},
        "ev_source": "archetype_default",
        "ivs": { "hp":31, "atk":31, "def":31, "spa":31, "spd":31, "spe":0 },
        "moves": ["Psychic", "Trick Room", "Dazzling Gleam", "Protect"],
        "tera": "Psychic",
        "role": "TR Setter"
      },
      {
        "name": "Farigiraf",
        "item": "Sitrus Berry",
        "ability": "Armor Tail",
        "nature": "Relaxed",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 4, "spa": 252, "spd": 0, "spe": 0},
        "ev_source": "archetype_default",
        "ivs": { "hp":31, "atk":31, "def":31, "spa":31, "spd":31, "spe":0 },
        "moves": ["Hyper Voice", "Trick Room", "Psychic", "Protect"],
        "tera": "Normal",
        "role": "TR Setter 2"
      },
      {
        "name": "Torkoal",
        "item": "Charcoal",
        "ability": "Drought",
        "nature": "Modest",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 4, "spa": 252, "spd": 0, "spe": 0},
        "ev_source": "archetype_default",
        "moves": ["Eruption", "Weather Ball", "Earth Power", "Protect"],
        "tera": "Fire",
        "role": "Sun Setter"
      },
      {
        "name": "Kingambit",
        "item": "Black Glasses",
        "ability": "Defiant",
        "nature": "Adamant",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Kowtow Cleave", "Sucker Punch", "Iron Head", "Swords Dance"],
        "tera": "Dark",
        "role": "Sweeper"
      },
      {
        "name": "Charizard-Mega-Y",
        "item": "Charizardite Y",
        "ability": "Solar Power",
        "nature": "Modest",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 0, "def": 0, "spa": 252, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Heat Wave", "Overheat", "Solar Beam", "Protect"],
        "tera": "Fire",
        "role": "Mega Attacker"
      }
    ]
  },
  "z2r_feitosa_mega_floette": {
    "name": "Z2R Feitosa — Mega Floette Balance",
    "label": "CHAMPIONS CUP",
    "style": "balance_mega",
    "description": "Mega Floette Fairy Aura Light of Ruin + Talonflame Gale Wings Tailwind + Basculegion/Kingambit dual wincon. Z2R Feitosa LIGA DA COMUNIDADE #2 Rank #2 15-0-0.",
    "champion_pack_id": "z2r_feitosa_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
    "source": "preloaded",
    "origin": {
      "url": "https://play.limitlesstcg.com/tournament/69d18b350e548b5c2fbe3486/player/pedrohenriq/teamlist",
      "player": "Z2R Feitosa",
      "event": "LIGA DA COMUNIDADE #2 (Rank #2, 15-0-0)"
    },
    "provenance": {
      "roster_source": "pikalytics_top_teams",
      "spread_source": "archetype_default",
      "author": "Z2R Feitosa",
      "url": "https://play.limitlesstcg.com/tournament/69d18b350e548b5c2fbe3486/player/pedrohenriq/teamlist",
      "status": "roster-verified-spreads-inferred"
    },
    "legality_status": "legal_inferred",
    "legality_notes": "Mega Floette (Eternal Flower) requires HOME transfer — flagged by legality module. Floettite new Champions Mega. Source: Pikalytics Top Teams.",
    "assumption_register": [
      "Roster (species/items/abilities/moves) verified from open team list.",
      "EVs, natures, and Tera types not disclosed by source; archetype-default spreads applied.",
      "Mega activation consumes team's once-per-match Mega slot."
    ],
    "members": [
      {
        "name": "Talonflame",
        "item": "Sharp Beak",
        "ability": "Gale Wings",
        "nature": "Jolly",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Protect", "Dual Wingbeat", "Flare Blitz", "Tailwind"],
        "tera": "Flying",
        "role": "Priority Tailwind"
      },
      {
        "name": "Garchomp",
        "item": "Roseli Berry",
        "ability": "Rough Skin",
        "nature": "Jolly",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Protect", "Rock Slide", "Earthquake", "Dragon Claw"],
        "tera": "Steel",
        "role": "Physical Attacker"
      },
      {
        "name": "Basculegion",
        "item": "Sitrus Berry",
        "ability": "Adaptability",
        "nature": "Adamant",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Protect", "Liquidation", "Last Respects", "Aqua Jet"],
        "tera": "Water",
        "role": "Revenge Killer"
      },
      {
        "name": "Kingambit",
        "item": "Black Glasses",
        "ability": "Defiant",
        "nature": "Adamant",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Protect", "Sucker Punch", "Iron Head", "Kowtow Cleave"],
        "tera": "Dark",
        "role": "Late-Game Cleaner"
      },
      {
        "name": "Sneasler",
        "item": "White Herb",
        "ability": "Unburden",
        "nature": "Jolly",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Protect", "Close Combat", "Gunk Shot", "Fake Out"],
        "tera": "Fighting",
        "role": "Fast Attacker"
      },
      {
        "name": "Floette (Eternal Flower)-Mega",
        "item": "Floettite",
        "ability": "Fairy Aura",
        "nature": "Timid",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 0, "def": 0, "spa": 252, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Protect", "Light of Ruin", "Dazzling Gleam", "Moonblast"],
        "tera": "Fairy",
        "role": "Mega Special Wall-Breaker"
      }
    ]
  },
  "benny_v_mega_froslass": {
    "name": "Benny V — Mega Froslass Wide League",
    "label": "WIDE LEAGUE",
    "style": "snow_mega",
    "description": "Mega Froslass Snow Cloak Blizzard + Basculegion Choice Scarf Last Respects + Kingambit closer. Benny V Wide League SNR #84 Rank #2 13-1-0.",
    "champion_pack_id": "benny_v_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
    "source": "preloaded",
    "origin": {
      "url": "https://play.limitlesstcg.com/tournament/69d7114dc734cfa1af2b581d/player/ginger78/teamlist",
      "player": "Benny V",
      "event": "Wide League SNR #84 (Rank #2, 13-1-0)"
    },
    "provenance": {
      "roster_source": "pikalytics_top_teams",
      "spread_source": "archetype_default",
      "author": "Benny V",
      "url": "https://play.limitlesstcg.com/tournament/69d7114dc734cfa1af2b581d/player/ginger78/teamlist",
      "status": "roster-verified-spreads-inferred"
    },
    "legality_status": "legal_inferred",
    "legality_notes": "Mega Froslass legal in Reg M-A via Froslassite. Standard Scarf + priority core. Source: Pikalytics Top Teams.",
    "assumption_register": [
      "Roster (species/items/abilities/moves) verified from open team list.",
      "EVs, natures, and Tera types not disclosed by source; archetype-default spreads applied.",
      "Mega activation consumes team's once-per-match Mega slot."
    ],
    "members": [
      {
        "name": "Basculegion",
        "item": "Choice Scarf",
        "ability": "Adaptability",
        "nature": "Adamant",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Wave Crash", "Last Respects", "Icy Wind", "Flip Turn"],
        "tera": "Water",
        "role": "Scarf Sweeper"
      },
      {
        "name": "Kingambit",
        "item": "Black Glasses",
        "ability": "Defiant",
        "nature": "Adamant",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Kowtow Cleave", "Sucker Punch", "Swords Dance", "Protect"],
        "tera": "Dark",
        "role": "Late-Game Cleaner"
      },
      {
        "name": "Rotom-Heat",
        "item": "Leftovers",
        "ability": "Levitate",
        "nature": "Bold",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 252, "spa": 0, "spd": 4, "spe": 0},
        "ev_source": "archetype_default",
        "moves": ["Thunderbolt", "Overheat", "Will-O-Wisp", "Protect"],
        "tera": "Water",
        "role": "Burn Support"
      },
      {
        "name": "Froslass-Mega",
        "item": "Froslassite",
        "ability": "Snow Cloak",
        "nature": "Timid",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 0, "def": 0, "spa": 252, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Blizzard", "Shadow Ball", "Taunt", "Protect"],
        "tera": "Ghost",
        "role": "Mega Snow Attacker"
      },
      {
        "name": "Sneasler",
        "item": "Focus Sash",
        "ability": "Poison Touch",
        "nature": "Jolly",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Close Combat", "Dire Claw", "Fake Out", "Protect"],
        "tera": "Fighting",
        "role": "Fake Out + Sash"
      },
      {
        "name": "Clefable",
        "item": "Sitrus Berry",
        "ability": "Unaware",
        "nature": "Calm",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 4, "spa": 0, "spd": 252, "spe": 0},
        "ev_source": "archetype_default",
        "moves": ["Moonblast", "Follow Me", "Helping Hand", "Protect"],
        "tera": "Fairy",
        "role": "Redirection"
      }
    ]
  },
  "lukasjoel1_sand_gengar": {
    "name": "lukasjoel1 — Sand + Mega Gengar ZGG",
    "label": "ZGG CUP",
    "style": "sand_trap",
    "description": "Tyranitar Sand Stream + Garchomp Sand Veil + Mega Gengar Shadow Tag trap core. lukasjoel1 ZGG #1 $200 Rank #2 13-2-0.",
    "champion_pack_id": "lukasjoel1_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
    "source": "preloaded",
    "origin": {
      "url": "https://play.limitlesstcg.com/tournament/69c44a46d478313a15a329c7/player/lukasjoel1/teamlist",
      "player": "lukasjoel1",
      "event": "ZGG #1 Pokemon Champions VGC $200 (Rank #2, 13-2-0)"
    },
    "provenance": {
      "roster_source": "pikalytics_top_teams",
      "spread_source": "archetype_default",
      "author": "lukasjoel1",
      "url": "https://play.limitlesstcg.com/tournament/69c44a46d478313a15a329c7/player/lukasjoel1/teamlist",
      "status": "roster-verified-spreads-inferred"
    },
    "legality_status": "legal_inferred",
    "legality_notes": "Mega Gengar legal in Reg M-A via Gengarite. Shadow Tag + sand core. Source: Pikalytics Top Teams.",
    "assumption_register": [
      "Roster (species/items/abilities/moves) verified from open team list.",
      "EVs, natures, and Tera types not disclosed by source; archetype-default spreads applied.",
      "Mega activation consumes team's once-per-match Mega slot."
    ],
    "members": [
      {
        "name": "Garchomp",
        "item": "Bright Powder",
        "ability": "Sand Veil",
        "nature": "Jolly",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Earthquake", "Dragon Claw", "Rock Slide", "Protect"],
        "tera": "Ground",
        "role": "Sand Attacker"
      },
      {
        "name": "Tyranitar",
        "item": "Shuca Berry",
        "ability": "Sand Stream",
        "nature": "Adamant",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Rock Slide", "Low Kick", "Ice Punch", "Protect"],
        "tera": "Rock",
        "role": "Sand Setter"
      },
      {
        "name": "Gengar-Mega",
        "item": "Gengarite",
        "ability": "Shadow Tag",
        "nature": "Timid",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 0, "def": 0, "spa": 252, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Shadow Ball", "Sludge Wave", "Focus Blast", "Protect"],
        "tera": "Ghost",
        "role": "Mega Trapper"
      },
      {
        "name": "Whimsicott",
        "item": "Mental Herb",
        "ability": "Prankster",
        "nature": "Timid",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 4, "spa": 0, "spd": 252, "spe": 0},
        "ev_source": "archetype_default",
        "moves": ["Moonblast", "Protect", "Tailwind", "Fake Tears"],
        "tera": "Grass",
        "role": "Prankster Support"
      },
      {
        "name": "Rotom-Wash",
        "item": "Leftovers",
        "ability": "Levitate",
        "nature": "Bold",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 252, "spa": 0, "spd": 4, "spe": 0},
        "ev_source": "archetype_default",
        "moves": ["Hydro Pump", "Volt Switch", "Will-O-Wisp", "Protect"],
        "tera": "Water",
        "role": "Burn Pivot"
      },
      {
        "name": "Sneasler",
        "item": "White Herb",
        "ability": "Unburden",
        "nature": "Jolly",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Close Combat", "Dire Claw", "Fake Out", "Protect"],
        "tera": "Fighting",
        "role": "Unburden Sweeper"
      }
    ]
  },
  "hiroto_imai_snow": {
    "name": "Hiroto Imai — Snow + Mega Lopunny",
    "label": "CHAMPIONS CUP",
    "style": "snow_offense",
    "description": "Vanilluxe Snow Warning + Choice Scarf Blizzard spam, Mega Lopunny Fake Out disruption, Aegislash Stance Change. Hiroto Imai Champions Arena Rank #75.",
    "champion_pack_id": "hiroto_imai_snow_champions_regma_v1",
    "format": "champions",
    "formatid": "champions-vgc-2026-regma",
    "gametype": "doubles",
    "ruleset": ["Species Clause", "Item Clause", "Bring 6 Pick 4", "Level 50"],
    "source": "preloaded",
    "origin": {
      "url": "https://vrpastes.com/htQ0opai",
      "player": "Hiroto Imai",
      "event": "The Champions Arena (Rank #75, 9-3)"
    },
    "provenance": {
      "roster_source": "pikalytics_top_teams",
      "spread_source": "archetype_default",
      "author": "Hiroto Imai",
      "url": "https://vrpastes.com/htQ0opai",
      "status": "roster-verified-spreads-inferred"
    },
    "legality_status": "legal_inferred",
    "legality_notes": "Mega Lopunny legal in Reg M-A via Lopunnite. Vanilluxe Snow Warning standard. Source: Pikalytics + VR Pastes.",
    "assumption_register": [
      "Roster (species/items/abilities/moves) verified from open team list.",
      "EVs, natures, and Tera types not disclosed by source; archetype-default spreads applied.",
      "Mega activation consumes team's once-per-match Mega slot."
    ],
    "members": [
      {
        "name": "Lopunny-Mega",
        "item": "Lopunnite",
        "ability": "Limber",
        "nature": "Jolly",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Close Combat", "Fake Out", "Encore", "Protect"],
        "tera": "Normal",
        "role": "Mega Fake Out"
      },
      {
        "name": "Aegislash",
        "item": "Spell Tag",
        "ability": "Stance Change",
        "nature": "Brave",
        "nature_source": "archetype_default",
        "evs": {"hp": 252, "atk": 0, "def": 4, "spa": 252, "spd": 0, "spe": 0},
        "ev_source": "archetype_default",
        "ivs": { "hp":31, "atk":31, "def":31, "spa":31, "spd":31, "spe":0 },
        "moves": ["Poltergeist", "Close Combat", "Shadow Sneak", "King's Shield"],
        "tera": "Ghost",
        "role": "Stance Attacker"
      },
      {
        "name": "Vanilluxe",
        "item": "Choice Scarf",
        "ability": "Snow Warning",
        "nature": "Modest",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 0, "def": 0, "spa": 252, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Blizzard", "Icy Wind", "Freeze-Dry", "Ice Shard"],
        "tera": "Ice",
        "role": "Snow Setter / Scarf"
      },
      {
        "name": "Garchomp",
        "item": "White Herb",
        "ability": "Rough Skin",
        "nature": "Jolly",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Dragon Claw", "Earthquake", "Rock Slide", "Protect"],
        "tera": "Ground",
        "role": "Physical Attacker"
      },
      {
        "name": "Kingambit",
        "item": "Chople Berry",
        "ability": "Defiant",
        "nature": "Adamant",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Kowtow Cleave", "Sucker Punch", "Low Kick", "Protect"],
        "tera": "Dark",
        "role": "Late-Game Cleaner"
      },
      {
        "name": "Basculegion",
        "item": "Sitrus Berry",
        "ability": "Adaptability",
        "nature": "Adamant",
        "nature_source": "archetype_default",
        "evs": {"hp": 4, "atk": 252, "def": 0, "spa": 0, "spd": 0, "spe": 252},
        "ev_source": "archetype_default",
        "moves": ["Wave Crash", "Last Respects", "Aqua Jet", "Protect"],
        "tera": "Water",
        "role": "Revenge Killer"
      }
    ]
  }

};
// Move type map for damage calc
const MOVE_TYPES = {
  // Player moves
  'Fake Out':'Normal', 'Flare Blitz':'Fire', 'Parting Shot':'Dark', 'Knock Off':'Dark',
  'Power Gem':'Rock', 'Head Smash':'Rock', 'Extreme Speed':'Normal', 'Will-O-Wisp':'Fire',
  'Earthquake':'Ground', 'Dragon Claw':'Dragon', 'Rock Slide':'Rock', 'Protect':'Normal',
  'Tailwind':'Flying', 'Sunny Day':'Fire', 'Moonblast':'Fairy', 'Thunderbolt':'Electric',
  'Hydro Pump':'Water', 'Fire Fang':'Fire',
  // Meta moves
  'Eruption':'Fire', 'Heat Wave':'Fire', 'Focus Blast':'Fighting', 'Shadow Ball':'Ghost',
  'Flamethrower':'Fire', 'Hyper Voice':'Normal', 'Roost':'Flying',
  'Trick Room':'Psychic', 'Life Dew':'Water', 'Rage Powder':'Bug', 'Matcha Gotcha':'Grass',
  'Ice Beam':'Ice', 'Thunder':'Electric', 'Hurricane':'Flying',
  'Wave Crash':'Water', 'Aqua Jet':'Water', 'Flip Turn':'Water', 'Last Respects':'Ghost',
  'Rain Dance':'Water', 'Thunder Wave':'Electric', 'Foul Play':'Dark',
  'Flash Cannon':'Steel', 'Dragon Pulse':'Dragon', 'Electro Shot':'Electric',
  'Weather Ball':'Normal', 'U-turn':'Bug', 'Helping Hand':'Normal', 'Shed Tail':'Normal', 'Iron Head':'Steel',
  'Scorching Sands':'Ground', 'Dark Pulse':'Dark',
  'Psychic Noise':'Psychic', 'Draco Meteor':'Dragon', 'Thunderbolt':'Electric',
  'Close Combat':'Fighting', 'Dire Claw':'Poison',
  'Rock Slide':'Rock', 'Ice Punch':'Ice',
  'High Horsepower':'Ground', 'Dragon Darts':'Dragon', 'Phantom Force':'Ghost',
  'Solar Beam':'Grass', 'Dazzling Gleam':'Fairy',
  'Air Slash':'Flying', 'Energy Ball':'Grass', 'Sludge Bomb':'Poison',
  'Sleep Powder':'Grass', 'Earth Power':'Ground',
  'Throat Chop':'Dark',
  // Issue #T3: removed duplicate 'Moon Blast' key — canonical name is 'Moonblast' (above).
  'Ally Switch':'Psychic', 'Shadow Ball':'Ghost',
  'Lunar Dance':'Psychic', 'Psychic':'Psychic', 'Shadow Sneak':'Ghost',
  'Psyshock':'Psychic', 'Mystical Fire':'Fire',
  // New meta team moves
  'Kowtow Cleave':'Dark', 'Sucker Punch':'Dark', 'Low Kick':'Fighting',
  'Muddy Water':'Water', 'Coil':'Poison', 'Hypnosis':'Psychic', 'Recover':'Normal',
  'Crunch':'Dark', 'Dragon Dance':'Dragon', 'Icy Wind':'Ice',
  'Imprison':'Psychic', 'Encore':'Normal', 'Stomping Tantrum':'Ground',
  'Overheat':'Fire', 'Aurora Veil':'Ice', 'Blizzard':'Ice', 'Fire Punch':'Fire',
  'Liquidation':'Water', 'Scale Shot':'Dragon', 'Darkest Lariat':'Dark',
  'Spore':'Grass', 'Blood Moon':'Normal', 'Vacuum Wave':'Fighting',
  'Make It Rain':'Steel', 'Feint':'Normal', 'Follow Me':'Normal', 'Haze':'Ice',
  'Scald':'Water', 'Coaching':'Fighting', 'Super Fang':'Normal',
  'Dragon Claw':'Dragon', 'Overheat':'Fire',
};


// ============================================================
// MOVE_TARGETS — Champions 2026 move target categories (T9j.2, Issue #33)
// ============================================================
// Categories:
//   'normal'             single target, redirectable by Follow Me/Rage Powder
//   'adjacent-foe'       same as 'normal' in this engine (no distance model)
//   'all-adjacent'       SPREAD — hits both foes + ally (doubles), foe only (singles)
//   'all-adjacent-foes'  SPREAD — hits both foes (doubles), foe only (singles)
//   'all-foes'           SPREAD — hits all living foes regardless of adjacency
//   'all-allies'         non-damaging boost/heal to allies
//   'self'               user only / sets side or field flag
//   'random-foe'         one random living foe, NOT redirectable
// Sources: Serebii Champions attackdex + Game8 Champions move pages
const MOVE_TARGETS = {
  // ---- All-adjacent (includes ally in doubles) ----
  'Earthquake':'all-adjacent', 'Magnitude':'all-adjacent', 'Surf':'all-adjacent',
  'Discharge':'all-adjacent', 'Lava Plume':'all-adjacent', 'Explosion':'all-adjacent',
  'Self-Destruct':'all-adjacent', 'Sludge Wave':'all-adjacent',
  'Parabolic Charge':'all-adjacent', 'Bulldoze':'all-adjacent',

  // ---- All-adjacent-foes ----
  'Rock Slide':'all-adjacent-foes', 'Heat Wave':'all-adjacent-foes',
  'Blizzard':'all-adjacent-foes', 'Muddy Water':'all-adjacent-foes',
  'Dazzling Gleam':'all-adjacent-foes', 'Hyper Voice':'all-adjacent-foes',
  'Eruption':'all-adjacent-foes', 'Water Spout':'all-adjacent-foes',
  'Snarl':'all-adjacent-foes', 'Icy Wind':'all-adjacent-foes',
  'Make It Rain':'all-adjacent-foes', 'Glacial Lance':'all-adjacent-foes',
  'Burning Jealousy':'all-adjacent-foes', 'Sparkling Aria':'all-adjacent-foes',
  'Clanging Scales':'all-adjacent-foes', 'Origin Pulse':'all-adjacent-foes',
  'Precipice Blades':'all-adjacent-foes', 'Diamond Storm':'all-adjacent-foes',
  'Matcha Gotcha':'all-adjacent-foes', 'Breaking Swipe':'all-adjacent-foes',

  // ---- All-foes (non-adjacent) ----
  'Perish Song':'all-foes', 'Haze':'all-foes',

  // ---- All-allies ----
  'Helping Hand':'all-allies', 'Life Dew':'all-allies',

  // ---- Self / flag-setters ----
  'Protect':'self', 'Detect':'self', 'Wide Guard':'self', 'Quick Guard':'self',
  "King's Shield":'self', 'Spiky Shield':'self', 'Baneful Bunker':'self',
  'Swords Dance':'self', 'Dragon Dance':'self', 'Nasty Plot':'self',
  'Calm Mind':'self', 'Bulk Up':'self', 'Coil':'self',
  'Roost':'self', 'Recover':'self', 'Shore Up':'self', 'Shed Tail':'self',
  'Substitute':'self', 'Rest':'self',
  'Follow Me':'self', 'Rage Powder':'self',
  'Tailwind':'self', 'Trick Room':'self',
  'Sunny Day':'self', 'Rain Dance':'self', 'Sandstorm':'self', 'Snowscape':'self',
  'Light Screen':'self', 'Reflect':'self', 'Aurora Veil':'self',
  'Imprison':'self', 'Ally Switch':'self', 'Lunar Dance':'self',

  // ---- Random-foe (NOT redirectable) ----
  'Outrage':'random-foe', 'Uproar':'random-foe',
  'Petal Dance':'random-foe', 'Thrash':'random-foe',

  // ---- Normal (single target, redirectable) ----
  'Thunderbolt':'normal', 'Flamethrower':'normal', 'Ice Beam':'normal',
  'Thunder':'normal', 'Hurricane':'normal', 'Moonblast':'normal',
  'Shadow Ball':'normal', 'Psychic':'normal', 'Psyshock':'normal',
  'Psychic Noise':'normal', 'Draco Meteor':'normal', 'Dragon Pulse':'normal',
  'Dragon Claw':'normal', 'Dragon Darts':'normal',
  'Close Combat':'normal', 'Focus Blast':'normal', 'Vacuum Wave':'normal',
  'Mystical Fire':'normal', 'Fire Fang':'normal', 'Fire Punch':'normal',
  'Flare Blitz':'normal', 'Overheat':'normal', 'Ice Punch':'normal',
  'Hydro Pump':'normal', 'Scald':'normal', 'Liquidation':'normal',
  'Wave Crash':'normal', 'Aqua Jet':'normal', 'Flip Turn':'normal',
  'U-turn':'normal', 'Knock Off':'normal', 'Foul Play':'normal',
  'Dark Pulse':'normal', 'Crunch':'normal', 'Kowtow Cleave':'normal',
  'Sucker Punch':'normal', 'Throat Chop':'normal', 'Darkest Lariat':'normal',
  'Low Kick':'normal', 'High Horsepower':'normal', 'Stomping Tantrum':'normal',
  'Earth Power':'normal', 'Scorching Sands':'normal',
  'Power Gem':'normal', 'Head Smash':'normal',
  'Iron Head':'normal', 'Flash Cannon':'normal', 'Electro Shot':'normal',
  'Weather Ball':'normal', 'Solar Beam':'normal', 'Energy Ball':'normal',
  'Sludge Bomb':'normal', 'Dire Claw':'normal', 'Scale Shot':'normal',
  'Blood Moon':'normal', 'Extreme Speed':'normal', 'Shadow Sneak':'normal',
  'Phantom Force':'normal', 'Last Respects':'normal', 'Air Slash':'normal',
  'Fake Out':'normal', 'Super Fang':'normal', 'Feint':'normal',
  'Parting Shot':'normal', 'Will-O-Wisp':'normal', 'Thunder Wave':'normal',
  'Taunt':'normal', 'Sleep Powder':'normal', 'Spore':'normal', 'Hypnosis':'normal',
  'Encore':'normal', 'Clear Smog':'normal', 'Rock Tomb':'normal',
  'Heal Pulse':'normal', 'Coaching':'normal',
  'Expanding Force':'normal',  // dynamic → 'all-adjacent-foes' under Psychic Terrain (Issue #36)
  'Tera Blast':'normal',       // normally single-target; type changes with Tera (Issue #7)
};

// Helpers (T9j.2, Issue #33)
function getMoveTarget(moveName) {
  const t = MOVE_TARGETS[moveName];
  if (!t) {
    if (typeof console !== 'undefined') {
      console.warn(`[MOVE_TARGETS] unknown move "${moveName}", defaulting to 'normal'`);
    }
    return 'normal';
  }
  return t;
}
function isSpreadMove(moveName) {
  const t = getMoveTarget(moveName);
  return t === 'all-adjacent' || t === 'all-adjacent-foes' || t === 'all-foes';
}


// Type effectiveness chart
const TYPE_CHART = {
  Normal:   { Ghost:0, Rock:0.5, Steel:0.5 },
  Fire:     { Fire:0.5, Water:0.5, Rock:0.5, Dragon:0.5, Grass:2, Ice:2, Bug:2, Steel:2 },
  Water:    { Water:0.5, Grass:0.5, Dragon:0.5, Fire:2, Ground:2, Rock:2 },
  Electric: { Electric:0.5, Grass:0.5, Dragon:0.5, Ground:0, Flying:2, Water:2 },
  Grass:    { Fire:0.5, Grass:0.5, Poison:0.5, Flying:0.5, Bug:0.5, Steel:0.5, Dragon:0.5, Water:2, Ground:2, Rock:2 },
  Ice:      { Water:0.5, Ice:0.5, Fire:2, Fighting:2, Rock:2, Steel:2, Grass:2, Ground:2, Flying:2, Dragon:2 },
  Fighting: { Normal:2, Ice:2, Rock:2, Dark:2, Steel:2, Poison:0.5, Bug:0.5, Psychic:0.5, Flying:0.5, Ghost:0, Fairy:0.5 },
  Poison:   { Grass:2, Fairy:2, Poison:0.5, Ground:0.5, Rock:0.5, Ghost:0.5, Steel:0 },
  Ground:   { Fire:2, Electric:2, Poison:2, Rock:2, Steel:2, Flying:0, Bug:0.5, Grass:0.5 },
  Flying:   { Grass:2, Fighting:2, Bug:2, Electric:0.5, Rock:0.5, Steel:0.5 },
  Psychic:  { Fighting:2, Poison:2, Psychic:0.5, Steel:0.5, Dark:0 },
  Bug:      { Grass:2, Psychic:2, Dark:2, Fire:0.5, Fighting:0.5, Flying:0.5, Ghost:0.5, Steel:0.5, Fairy:0.5 },
  Rock:     { Fire:2, Ice:2, Flying:2, Bug:2, Fighting:0.5, Ground:0.5, Steel:0.5 },
  Ghost:    { Ghost:2, Psychic:2, Normal:0, Dark:0.5 },
  Dragon:   { Dragon:2, Steel:0.5, Fairy:0 },
  Dark:     { Ghost:2, Psychic:2, Fighting:0.5, Dark:0.5, Fairy:0.5 },
  Steel:    { Ice:2, Rock:2, Fairy:2, Fire:0.5, Water:0.5, Electric:0.5, Steel:0.5 },
  Fairy:    { Fighting:2, Dragon:2, Dark:2, Fire:0.5, Poison:0.5, Steel:0.5 },
};

function getEffectiveness(moveType, defTypes) {
  let mult = 1;
  for (const dt of defTypes) {
    const row = TYPE_CHART[moveType] || {};
    mult *= (row[dt] !== undefined ? row[dt] : 1);
  }
  return mult;
}


// ============================================================
// CHAMPIONS MEGA EVOLUTION REGISTRY (T9c)
// Source: CHAMPIONS_MEGA_DATASET.json (cross-confirmed audit, 60 entries)
// All Reg M-A legal Megas. Keyed by Mega display name ("Base-Mega" or
//   "Base-Mega-X/Y/M/F" / "Base-Mega-EF" for Floette Eternal Flower).
// Schema: { baseSpecies, nationalDex, types, ability, abilityIsNew,
//           abilityIsUpdated, megaBaseStats{hp,atk,def,spa,spd,spe},
//           megaStone, megaStoneSource }
// Engine hooks (deferred, see GitHub issues filed post-audit):
//   Mega activation should check holder.item === megaStone, then swap
//   BASE_STATS + ability at start of turn on user command. Stat swap
//   retains SP, Alignment, HP% delta. Only one Mega per side per battle.
// Sources:
//   Game8 Mega list: https://game8.co/games/Pokemon-Champions/archives/592472
//   Game8 Items:     https://game8.co/games/Pokemon-Champions/archives/588871
//   Serebii New Abilities: https://www.serebii.net/pokemonchampions/newabilities.shtml
//   Serebii Updated Abilities: https://www.serebii.net/pokemonchampions/updatedabilities.shtml
//   Serebii Mega Abilities: https://www.serebii.net/pokemonchampions/megaabilities.shtml
//   Serebii Reg M-A: https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml
// ============================================================
var CHAMPIONS_MEGAS = {
  'Venusaur-Mega': { baseSpecies:'Venusaur', nationalDex:3, types:['Grass','Poison'], ability:'Thick Fat', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:80,atk:100,def:123,spa:122,spd:120,spe:80}, megaStone:'Venusaurite', megaStoneSource:"Shop: 2000 VP" },
  'Charizard-Mega-X': { baseSpecies:'Charizard', nationalDex:6, types:['Fire','Dragon'], ability:'Tough Claws', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:78,atk:130,def:111,spa:130,spd:85,spe:100}, megaStone:'Charizardite X', megaStoneSource:"Shop: 2000 VP" },
  'Charizard-Mega-Y': { baseSpecies:'Charizard', nationalDex:6, types:['Fire','Flying'], ability:'Drought', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:78,atk:104,def:78,spa:159,spd:115,spe:100}, megaStone:'Charizardite Y', megaStoneSource:"Shop: 2000 VP" },
  'Blastoise-Mega': { baseSpecies:'Blastoise', nationalDex:9, types:['Water'], ability:'Mega Launcher', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:79,atk:103,def:120,spa:135,spd:115,spe:78}, megaStone:'Blastoisinite', megaStoneSource:"Shop: 2000 VP" },
  'Beedrill-Mega': { baseSpecies:'Beedrill', nationalDex:15, types:['Bug','Poison'], ability:'Adaptability', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:65,atk:150,def:40,spa:15,spd:80,spe:145}, megaStone:'Beedrillite', megaStoneSource:"Battle Tutorial: Mega Evolution" },
  'Pidgeot-Mega': { baseSpecies:'Pidgeot', nationalDex:18, types:['Normal','Flying'], ability:'No Guard', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:83,atk:80,def:80,spa:135,spd:80,spe:121}, megaStone:'Pidgeotite', megaStoneSource:"Shop: 2000 VP" },
  'Clefable-Mega': { baseSpecies:'Clefable', nationalDex:36, types:['Fairy'], ability:'Magic Bounce', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:95,atk:80,def:93,spa:135,spd:110,spe:70}, megaStone:'Clefablite', megaStoneSource:"Shop: 2000 VP" },
  'Alakazam-Mega': { baseSpecies:'Alakazam', nationalDex:65, types:['Psychic'], ability:'Trace', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:55,atk:50,def:65,spa:175,spd:105,spe:150}, megaStone:'Alakazite', megaStoneSource:"Shop: 2000 VP" },
  'Victreebel-Mega': { baseSpecies:'Victreebel', nationalDex:71, types:['Grass','Poison'], ability:'Innards Out', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:80,atk:125,def:85,spa:135,spd:95,spe:70}, megaStone:'Victreebelite', megaStoneSource:"Shop: 2000 VP" },
  'Slowbro-Mega': { baseSpecies:'Slowbro', nationalDex:80, types:['Water','Psychic'], ability:'Shell Armor', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:95,atk:75,def:180,spa:130,spd:80,spe:30}, megaStone:'Slowbronite', megaStoneSource:"Shop: 2000 VP" },
  'Gengar-Mega': { baseSpecies:'Gengar', nationalDex:94, types:['Ghost','Poison'], ability:'Shadow Tag', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:60,atk:65,def:80,spa:170,spd:95,spe:130}, megaStone:'Gengarite', megaStoneSource:"Shop: 2000 VP" },
  'Kangaskhan-Mega': { baseSpecies:'Kangaskhan', nationalDex:115, types:['Normal'], ability:'Parental Bond', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:105,atk:125,def:100,spa:60,spd:100,spe:100}, megaStone:'Kangaskhanite', megaStoneSource:"Shop: 2000 VP" },
  'Starmie-Mega': { baseSpecies:'Starmie', nationalDex:121, types:['Water','Psychic'], ability:'Huge Power', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:60,atk:100,def:105,spa:130,spd:105,spe:120}, megaStone:'Starminite', megaStoneSource:"Shop: 2000 VP" },
  'Pinsir-Mega': { baseSpecies:'Pinsir', nationalDex:127, types:['Bug','Flying'], ability:'Aerilate', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:65,atk:155,def:120,spa:65,spd:90,spe:105}, megaStone:'Pinsirite', megaStoneSource:"Shop: 2000 VP" },
  'Gyarados-Mega': { baseSpecies:'Gyarados', nationalDex:130, types:['Water','Dark'], ability:'Mold Breaker', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:95,atk:155,def:109,spa:70,spd:130,spe:81}, megaStone:'Gyaradosite', megaStoneSource:"Battle Tutorial: Mega Evolution" },
  'Aerodactyl-Mega': { baseSpecies:'Aerodactyl', nationalDex:142, types:['Rock','Flying'], ability:'Tough Claws', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:80,atk:135,def:85,spa:70,spd:95,spe:150}, megaStone:'Aerodactylite', megaStoneSource:"Shop: 2000 VP" },
  'Dragonite-Mega': { baseSpecies:'Dragonite', nationalDex:149, types:['Dragon','Flying'], ability:'Multiscale', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:91,atk:124,def:115,spa:145,spd:125,spe:100}, megaStone:'Dragoninite', megaStoneSource:"Shop: 2000 VP" },
  'Meganium-Mega': { baseSpecies:'Meganium', nationalDex:154, types:['Grass','Fairy'], ability:'Mega Sol', abilityIsNew:true, abilityIsUpdated:false, megaBaseStats:{hp:80,atk:92,def:115,spa:143,spd:115,spe:80}, megaStone:'Meganiumite', megaStoneSource:"Shop: 2000 VP; Battle Pass: Season M-1" },
  'Feraligatr-Mega': { baseSpecies:'Feraligatr', nationalDex:160, types:['Water','Dragon'], ability:'Dragonize', abilityIsNew:true, abilityIsUpdated:false, megaBaseStats:{hp:85,atk:160,def:125,spa:89,spd:93,spe:78}, megaStone:'Feraligite', megaStoneSource:"Shop: 2000 VP; Battle Pass: Season M-1" },
  'Ampharos-Mega': { baseSpecies:'Ampharos', nationalDex:181, types:['Electric','Dragon'], ability:'Mold Breaker', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:90,atk:95,def:105,spa:165,spd:110,spe:45}, megaStone:'Ampharosite', megaStoneSource:"Shop: 2000 VP" },
  'Steelix-Mega': { baseSpecies:'Steelix', nationalDex:208, types:['Steel','Ground'], ability:'Sand Force', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:75,atk:125,def:230,spa:55,spd:95,spe:30}, megaStone:'Steelixite', megaStoneSource:"Battle Tutorial: Mega Evolution" },
  'Scizor-Mega': { baseSpecies:'Scizor', nationalDex:212, types:['Bug','Steel'], ability:'Technician', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:70,atk:150,def:140,spa:65,spd:100,spe:75}, megaStone:'Scizorite', megaStoneSource:"Shop: 2000 VP" },
  'Heracross-Mega': { baseSpecies:'Heracross', nationalDex:214, types:['Bug','Fighting'], ability:'Skill Link', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:80,atk:185,def:115,spa:40,spd:105,spe:75}, megaStone:'Heracronite', megaStoneSource:"Battle Tutorial: Mega Evolution" },
  'Skarmory-Mega': { baseSpecies:'Skarmory', nationalDex:227, types:['Steel','Flying'], ability:'Stalwart', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:65,atk:140,def:110,spa:40,spd:100,spe:110}, megaStone:'Skarmorite', megaStoneSource:"Shop: 2000 VP" },
  'Houndoom-Mega': { baseSpecies:'Houndoom', nationalDex:229, types:['Dark','Fire'], ability:'Solar Power', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:75,atk:90,def:90,spa:140,spd:90,spe:115}, megaStone:'Houndoominite', megaStoneSource:"Shop: 2000 VP" },
  'Tyranitar-Mega': { baseSpecies:'Tyranitar', nationalDex:248, types:['Rock','Dark'], ability:'Sand Stream', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:100,atk:164,def:150,spa:95,spd:120,spe:71}, megaStone:'Tyranitarite', megaStoneSource:"Shop: 2000 VP" },
  'Gardevoir-Mega': { baseSpecies:'Gardevoir', nationalDex:282, types:['Psychic','Fairy'], ability:'Pixilate', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:68,atk:85,def:65,spa:165,spd:135,spe:100}, megaStone:'Gardevoirite', megaStoneSource:"Shop: 2000 VP" },
  'Sableye-Mega': { baseSpecies:'Sableye', nationalDex:302, types:['Dark','Ghost'], ability:'Magic Bounce', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:50,atk:85,def:125,spa:85,spd:115,spe:20}, megaStone:'Sablenite', megaStoneSource:"Shop: 2000 VP" },
  'Aggron-Mega': { baseSpecies:'Aggron', nationalDex:306, types:['Steel'], ability:'Filter', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:70,atk:140,def:230,spa:60,spd:80,spe:50}, megaStone:'Aggronite', megaStoneSource:"Battle Tutorial: Mega Evolution" },
  'Medicham-Mega': { baseSpecies:'Medicham', nationalDex:308, types:['Fighting','Psychic'], ability:'Pure Power', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:60,atk:100,def:85,spa:80,spd:85,spe:100}, megaStone:'Medichamite', megaStoneSource:"Shop: 2000 VP" },
  'Manectric-Mega': { baseSpecies:'Manectric', nationalDex:310, types:['Electric'], ability:'Intimidate', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:70,atk:75,def:80,spa:135,spd:80,spe:135}, megaStone:'Manectite', megaStoneSource:"Battle Tutorial: Mega Evolution" },
  'Sharpedo-Mega': { baseSpecies:'Sharpedo', nationalDex:319, types:['Water','Dark'], ability:'Strong Jaw', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:70,atk:140,def:70,spa:110,spd:65,spe:105}, megaStone:'Sharpedonite', megaStoneSource:"Shop: 2000 VP" },
  'Camerupt-Mega': { baseSpecies:'Camerupt', nationalDex:323, types:['Fire','Ground'], ability:'Sheer Force', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:70,atk:120,def:100,spa:145,spd:105,spe:20}, megaStone:'Cameruptite', megaStoneSource:"Shop: 2000 VP" },
  'Altaria-Mega': { baseSpecies:'Altaria', nationalDex:334, types:['Dragon','Fairy'], ability:'Pixilate', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:75,atk:110,def:110,spa:110,spd:105,spe:80}, megaStone:'Altarianite', megaStoneSource:"Shop: 2000 VP" },
  'Banette-Mega': { baseSpecies:'Banette', nationalDex:354, types:['Ghost'], ability:'Prankster', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:64,atk:165,def:75,spa:93,spd:83,spe:75}, megaStone:'Banettite', megaStoneSource:"Shop: 2000 VP" },
  'Chimecho-Mega': { baseSpecies:'Chimecho', nationalDex:358, types:['Psychic','Steel'], ability:'Levitate', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:75,atk:50,def:110,spa:135,spd:120,spe:65}, megaStone:'Chimechite', megaStoneSource:"Shop: 2000 VP" },
  'Absol-Mega': { baseSpecies:'Absol', nationalDex:359, types:['Dark'], ability:'Magic Bounce', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:65,atk:150,def:60,spa:115,spd:60,spe:115}, megaStone:'Absolite', megaStoneSource:"Shop: 2000 VP" },
  'Glalie-Mega': { baseSpecies:'Glalie', nationalDex:362, types:['Ice'], ability:'Refrigerate', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:80,atk:120,def:80,spa:120,spd:80,spe:100}, megaStone:'Glalitite', megaStoneSource:"Shop: 2000 VP" },
  'Lopunny-Mega': { baseSpecies:'Lopunny', nationalDex:428, types:['Normal','Fighting'], ability:'Scrappy', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:65,atk:136,def:94,spa:54,spd:96,spe:135}, megaStone:'Lopunnite', megaStoneSource:"Shop: 2000 VP" },
  'Garchomp-Mega': { baseSpecies:'Garchomp', nationalDex:445, types:['Dragon','Ground'], ability:'Sand Force', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:108,atk:170,def:115,spa:120,spd:95,spe:92}, megaStone:'Garchompite', megaStoneSource:"Battle Tutorial: Mega Evolution" },
  'Lucario-Mega': { baseSpecies:'Lucario', nationalDex:448, types:['Fighting','Steel'], ability:'Adaptability', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:70,atk:145,def:88,spa:140,spd:70,spe:112}, megaStone:'Lucarionite', megaStoneSource:"Shop: 2000 VP" },
  'Abomasnow-Mega': { baseSpecies:'Abomasnow', nationalDex:460, types:['Grass','Ice'], ability:'Snow Warning', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:90,atk:132,def:105,spa:132,spd:105,spe:30}, megaStone:'Abomasite', megaStoneSource:"Battle Tutorial: Mega Evolution" },
  'Gallade-Mega': { baseSpecies:'Gallade', nationalDex:475, types:['Psychic','Fighting'], ability:'Inner Focus', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:68,atk:165,def:95,spa:65,spd:115,spe:110}, megaStone:'Galladite', megaStoneSource:"Shop: 2000 VP" },
  'Froslass-Mega': { baseSpecies:'Froslass', nationalDex:478, types:['Ice','Ghost'], ability:'Snow Warning', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:70,atk:80,def:70,spa:140,spd:100,spe:120}, megaStone:'Froslassite', megaStoneSource:"Shop: 2000 VP" },
  'Emboar-Mega': { baseSpecies:'Emboar', nationalDex:500, types:['Fire','Fighting'], ability:'Mold Breaker', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:110,atk:148,def:75,spa:110,spd:110,spe:75}, megaStone:'Emboarite', megaStoneSource:"Shop: 2000 VP; Battle Pass: Season M-1" },
  'Excadrill-Mega': { baseSpecies:'Excadrill', nationalDex:530, types:['Ground','Steel'], ability:'Piercing Drill', abilityIsNew:true, abilityIsUpdated:false, megaBaseStats:{hp:110,atk:165,def:100,spa:65,spd:65,spe:103}, megaStone:'Excadrite', megaStoneSource:"Shop: 2000 VP" },
  'Audino-Mega': { baseSpecies:'Audino', nationalDex:531, types:['Normal','Fairy'], ability:'Healer', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:103,atk:60,def:126,spa:80,spd:126,spe:50}, megaStone:'Audinite', megaStoneSource:"Shop: 2000 VP" },
  'Chandelure-Mega': { baseSpecies:'Chandelure', nationalDex:609, types:['Ghost','Fire'], ability:'Infiltrator', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:60,atk:75,def:110,spa:175,spd:110,spe:90}, megaStone:'Chandelurite', megaStoneSource:"Shop: 2000 VP" },
  'Golurk-Mega': { baseSpecies:'Golurk', nationalDex:623, types:['Ground','Ghost'], ability:'Unseen Fist', abilityIsNew:false, abilityIsUpdated:true, megaBaseStats:{hp:89,atk:159,def:105,spa:70,spd:105,spe:55}, megaStone:'Golurkite', megaStoneSource:"Shop: 2000 VP" },
  'Chesnaught-Mega': { baseSpecies:'Chesnaught', nationalDex:652, types:['Grass','Fighting'], ability:'Bulletproof', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:88,atk:137,def:172,spa:74,spd:115,spe:44}, megaStone:'Chesnaughtite', megaStoneSource:"Transfer Gifts: Transfer Chesnaught to Pokemon Champions" },
  'Delphox-Mega': { baseSpecies:'Delphox', nationalDex:655, types:['Fire','Psychic'], ability:'Levitate', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:75,atk:69,def:72,spa:159,spd:125,spe:134}, megaStone:'Delphoxite', megaStoneSource:"Transfer Gifts: Transfer Delphox to Pokemon Champions" },
  'Greninja-Mega': { baseSpecies:'Greninja', nationalDex:658, types:['Water','Dark'], ability:'Protean', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:72,atk:125,def:77,spa:133,spd:81,spe:142}, megaStone:'Greninjite', megaStoneSource:"Transfer Gifts: Transfer Greninja to Pokemon Champions" },
  'Floette (Eternal Flower)-Mega': { baseSpecies:'Floette (Eternal Flower)', nationalDex:670, types:['Fairy'], ability:'Fairy Aura', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:74,atk:85,def:87,spa:155,spd:148,spe:102}, megaStone:'Floettite', megaStoneSource:"Transfer Gifts: Transfer Eternal Flower Floette to Pokemon Champions" },
  'Meowstic (Male)-Mega': { baseSpecies:'Meowstic (Male)', nationalDex:678, types:['Psychic'], ability:'Trace', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:74,atk:48,def:76,spa:143,spd:101,spe:124}, megaStone:'Meowsticite', megaStoneSource:"Shop: 2000 VP" },
  'Meowstic (Female)-Mega': { baseSpecies:'Meowstic (Female)', nationalDex:678, types:['Psychic'], ability:'Trace', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:74,atk:48,def:76,spa:83,spd:81,spe:104}, megaStone:'Meowsticite', megaStoneSource:"Shop: 2000 VP" },
  'Hawlucha-Mega': { baseSpecies:'Hawlucha', nationalDex:701, types:['Fighting','Flying'], ability:'No Guard', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:78,atk:137,def:100,spa:74,spd:93,spe:118}, megaStone:'Hawluchanite', megaStoneSource:"Shop: 2000 VP" },
  'Crabominable-Mega': { baseSpecies:'Crabominable', nationalDex:740, types:['Fighting','Ice'], ability:'Iron Fist', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:97,atk:157,def:122,spa:62,spd:107,spe:33}, megaStone:'Crabominite', megaStoneSource:"Shop: 2000 VP" },
  'Drampa-Mega': { baseSpecies:'Drampa', nationalDex:780, types:['Normal','Dragon'], ability:'Berserk', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:78,atk:85,def:110,spa:160,spd:116,spe:36}, megaStone:'Drampanite', megaStoneSource:"Shop: 2000 VP" },
  'Scovillain-Mega': { baseSpecies:'Scovillain', nationalDex:952, types:['Grass','Fire'], ability:'Spicy Spray', abilityIsNew:true, abilityIsUpdated:false, megaBaseStats:{hp:65,atk:138,def:85,spa:138,spd:85,spe:75}, megaStone:'Scovillainite', megaStoneSource:"Shop: 2000 VP" },
  'Glimmora-Mega': { baseSpecies:'Glimmora', nationalDex:970, types:['Rock','Poison'], ability:'Adaptability', abilityIsNew:false, abilityIsUpdated:false, megaBaseStats:{hp:83,atk:90,def:105,spa:150,spd:96,spe:101}, megaStone:'Glimmoranite', megaStoneSource:"Shop: 2000 VP" },
};

// New Champions-exclusive abilities (engine hooks to be implemented per
// filed GitHub issues). Each entry records the Mega holder + effect tag
// for dispatch wiring.
var CHAMPIONS_NEW_ABILITIES = {
  'Piercing Drill': { holder:'Excadrill-Mega',  effect:'contact-bypass-protect-25pct',
                      sources:['https://www.serebii.net/pokemonchampions/newabilities.shtml'] },
  'Dragonize':      { holder:'Feraligatr-Mega', effect:'normal-to-dragon-plus-20pct',
                      sources:['https://www.serebii.net/pokemonchampions/newabilities.shtml'] },
  'Mega Sol':       { holder:'Meganium-Mega',   effect:'personal-sun-no-weather',
                      sources:['https://www.serebii.net/pokemonchampions/newabilities.shtml'] },
  'Spicy Spray':    { holder:'Scovillain-Mega', effect:'burn-attacker-on-damage',
                      sources:['https://www.serebii.net/pokemonchampions/newabilities.shtml'] }
};

// Abilities nerfed from prior gens for Champions. Engine must apply the
// new behavior when referenced (see CHAMPIONS_MEGAS.abilityIsUpdated flag
// and Urshifu forms for Unseen Fist).
var CHAMPIONS_UPDATED_ABILITIES = {
  'Unseen Fist':   { from:'full-damage-through-protect', to:'25pct-through-protect',
                     damageThroughProtect:0.25,
                     sources:['https://www.serebii.net/pokemonchampions/updatedabilities.shtml'] },
  'Parental Bond': { from:'child-1/2-power', to:'child-1/4-power',
                     childPowerMult:0.25,
                     sources:['https://game8.co/games/Pokemon-Champions/archives/590403'] },
  'Protean':       { from:'change-every-move', to:'change-once-per-entry',
                     oncePerEntry:true,
                     sources:['https://game8.co/games/Pokemon-Champions/archives/590403'] }
};

// T9j.7: Base-form ability lookup. Stored team ability is post-Mega (e.g.
// Altaria-Mega has ability:'Pixilate') but the mon enters battle in base form
// until the Mega Stone trigger fires, so we need to restore the base ability.
// Sources: Bulbapedia, RotomLabs, Game8 per-species pages.
// NOTE: `var` declaration is deliberate (TDZ-safe; referenced during init).
var CHAMPIONS_BASE_ABILITIES = {
  // Priority fill: base species used by the 13 loaded tournament teams.
  'Altaria':     'Natural Cure',
  'Charizard':   'Blaze',
  'Dragonite':   'Multiscale',
  'Drampa':      'Sap Sipper',
  'Floette (Eternal Flower)': 'Flower Veil',
  'Froslass':    'Snow Cloak',
  'Gengar':      'Cursed Body',
  'Golurk':      'Iron Fist',
  'Houndoom':    'Flash Fire',
  'Lopunny':     'Cute Charm',
  'Meganium':    'Overgrow',
  'Tyranitar':   'Sand Stream',
  // Backfill for other CHAMPIONS_MEGAS entries (as referenced by future teams).
  'Venusaur':    'Overgrow',
  'Blastoise':   'Torrent',
  'Beedrill':    'Swarm',
  'Pidgeot':     'Keen Eye',
  'Clefable':    'Magic Guard',
  'Alakazam':    'Magic Guard',
  'Victreebel':  'Chlorophyll',
  'Slowbro':     'Oblivious',
  'Kangaskhan':  'Early Bird',
  'Starmie':     'Natural Cure',
  'Pinsir':      'Hyper Cutter',
  'Gyarados':    'Intimidate',
  'Aerodactyl':  'Rock Head',
  'Ampharos':    'Static',
  'Steelix':     'Rock Head',
  'Scizor':      'Technician',
  'Heracross':   'Swarm',
  'Skarmory':    'Keen Eye',
  'Gardevoir':   'Trace',
  'Sableye':     'Keen Eye',
  'Aggron':      'Rock Head',
  'Medicham':    'Pure Power',
  'Manectric':   'Lightning Rod',
  'Sharpedo':    'Rough Skin',
  'Camerupt':    'Magma Armor',
  'Banette':     'Cursed Body',
  'Chimecho':    'Levitate',
  'Absol':       'Pressure',
  'Glalie':      'Inner Focus',
  'Garchomp':    'Sand Veil',
  'Lucario':     'Steadfast',
  'Abomasnow':   'Snow Warning',
  'Gallade':     'Steadfast',
  'Emboar':      'Blaze',
  'Excadrill':   'Sand Rush',
  'Audino':      'Regenerator',
  'Chandelure':  'Flame Body',
  'Chesnaught':  'Bulletproof',
  'Delphox':     'Blaze',
  'Greninja':    'Torrent',
  'Meowstic-M':  'Keen Eye',
  'Meowstic-F':  'Keen Eye',
  'Hawlucha':    'Limber',
  'Crabominable':'Hyper Cutter',
  'Scovillain':  'Chlorophyll',
  'Glimmora':    'Toxic Debris',
  'Feraligatr':  'Torrent'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports.CHAMPIONS_MEGAS = CHAMPIONS_MEGAS;
  module.exports.CHAMPIONS_NEW_ABILITIES = CHAMPIONS_NEW_ABILITIES;
  module.exports.CHAMPIONS_UPDATED_ABILITIES = CHAMPIONS_UPDATED_ABILITIES;
  module.exports.CHAMPIONS_BASE_ABILITIES = CHAMPIONS_BASE_ABILITIES;
}
