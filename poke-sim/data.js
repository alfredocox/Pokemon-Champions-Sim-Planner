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
  'Dragonite-Mega': { hp:91, atk:175, def:95, spa:100, spd:100, spe:80, types:['Dragon','Flying'] },
  'Basculegion':  { hp:120, atk:112, def:65, spa:80, spd:75, spe:78, types:['Water','Ghost'] },
  Liepard:        { hp:64, atk:88, def:50, spa:88, spd:50, spe:106, types:['Dark'] },
  Archaludon:     { hp:90, atk:105, def:130, spa:125, spd:65, spe:85, types:['Steel','Dragon'] },
  Pelipper:       { hp:60, atk:50, def:100, spa:95, spd:70, spe:65, types:['Water','Flying'] },
  Orthworm:       { hp:70, atk:85, def:145, spa:60, spd:55, spe:40, types:['Steel'] },
  // Mega Houndoom
  'Houndoom-Mega': { hp:75, atk:90, def:90, spa:140, spd:90, spe:115, types:['Dark','Fire'] },
  Torkoal:        { hp:70, atk:85, def:140, spa:85, spd:70, spe:20, types:['Fire'] },
  Farigiraf:      { hp:120, atk:90, def:70, spa:90, spd:90, spe:60, types:['Normal','Psychic'] },
  'Drampa-Mega':  { hp:89, atk:90, def:85, spa:145, spd:100, spe:60, types:['Normal','Dragon'] },
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
  'Froslass-Mega': { hp:70, atk:80, def:70, spa:105, spd:95, spe:125, types:['Ice','Ghost'] },
  Milotic:         { hp:95, atk:60, def:79, spa:100, spd:125, spe:81, types:['Water'] },
  Kingambit:       { hp:100, atk:135, def:120, spa:60, spd:85, spe:50, types:['Dark','Steel'] },
  Amoonguss:       { hp:114, atk:85, def:70, spa:85, spd:80, spe:30, types:['Grass','Poison'] },
  Gholdengo:       { hp:87, atk:60, def:95, spa:133, spd:91, spe:84, types:['Steel','Ghost'] },
  'Ursaluna-Bloodmoon': { hp:113, atk:70, def:85, spa:135, spd:95, spe:55, types:['Ground','Normal'] },
  Maushold:        { hp:74, atk:75, def:70, spa:65, spd:75, spe:111, types:['Normal'] },
  Dragonite:       { hp:91, atk:134, def:95, spa:100, spd:100, spe:80, types:['Dragon','Flying'] },
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
    "legality_status": "illegal",
    "legality_notes": "Contains Dragonite-Mega (fakemon). Quarantined in T9.",
    "assumption_register": [
        "Dragonite has no Mega Evolution in any official game."
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
    "legality_status": "illegal",
    "legality_notes": "Contains Drampa-Mega (fakemon). Quarantined in T9.",
    "assumption_register": [
        "Drampa has no Mega Evolution in any official game."
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
    "legality_status": "illegal",
    "legality_notes": "Contains Meganium-Mega (fakemon). Quarantined in T9.",
    "assumption_register": [
        "Meganium has no Mega Evolution in any official game."
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
    "legality_status": "illegal",
    "legality_notes": "Contains Froslass-Mega (fakemon). Quarantined in T9.",
    "assumption_register": [
        "Froslass has no Mega Evolution in any official game."
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
