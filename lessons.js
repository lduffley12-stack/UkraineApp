// Lesson data for Ukrainian learner.
// Each item fields:
//   uk:        Cyrillic text (the target)
//   translit:  Latin transliteration (whole word)
//   en:        English meaning
//   breakdown: syllable-by-syllable Latin pronunciation with the stressed
//              syllable in ALL CAPS (e.g. "pry-VIT" — stress on the 2nd)
//   hint:      (optional) short English tip about a tricky sound
//   accept:    (optional) alternate Cyrillic spellings accepted by the grader
// Lessons are ordered easiest -> hardest: single words -> short phrases -> full sentences.

const LESSONS = [
  // ---------- LEVEL 1: WORDS ----------
  {
    id: "greetings",
    level: "words",
    title: "Greetings",
    description: "The first words you'll use every day.",
    items: [
      { uk: "Привіт",       translit: "Pryvit",       breakdown: "pry-VIT",              hint: "Stress the 2nd syllable; 'і' = 'ee'.",      en: "Hi / Hello (informal)" },
      { uk: "Добрий день",  translit: "Dobryi den",   breakdown: "DOB-ryi DEN",          hint: "Two short words, stress the first syllable of each.", en: "Good day / Hello" },
      { uk: "Доброго ранку",translit: "Dobroho ranku",breakdown: "DOB-ro-ho RAN-ku",     hint: "'г' is a soft 'h'.",                        en: "Good morning" },
      { uk: "Добрий вечір", translit: "Dobryi vechir",breakdown: "DOB-ryi VE-chir",      hint: "'ч' = 'ch' in 'church'.",                   en: "Good evening" },
      { uk: "На добраніч",  translit: "Na dobranich", breakdown: "na do-BRA-nich",       hint: "Stress the middle: do-BRA-nich.",           en: "Good night" },
      { uk: "До побачення", translit: "Do pobachennia", breakdown: "do po-BA-chen-nia",  hint: "Stress 'BA'; double 'н' is held a beat.",   en: "Goodbye" },
      { uk: "Бувай",        translit: "Buvai",        breakdown: "bu-VAI",               hint: "Ends with 'ay' as in 'sky'.",              en: "Bye (informal)" }
    ]
  },
  {
    id: "essentials",
    level: "words",
    title: "Essential Words",
    description: "Yes, no, please, thank you — the building blocks.",
    items: [
      { uk: "Так",       translit: "Tak",       breakdown: "TAK",           en: "Yes" },
      { uk: "Ні",        translit: "Ni",        breakdown: "NI",            hint: "'i' = long 'ee'.",                         en: "No" },
      { uk: "Будь ласка",translit: "Bud laska", breakdown: "BUD' LAS-ka",   hint: "The 'ь' softens: 'BUD-y'.",                en: "Please / You're welcome" },
      { uk: "Дякую",     translit: "Diakuiu",   breakdown: "DIA-ku-iu",     hint: "Stress the 1st. 'ю' = 'yoo'.",             en: "Thank you" },
      { uk: "Вибачте",   translit: "Vybachte",  breakdown: "VY-bach-te",    hint: "Stress the 1st. 'и' = short 'y' sound.",   en: "Sorry / Excuse me" },
      { uk: "Добре",     translit: "Dobre",     breakdown: "DOB-re",        en: "Good / Okay" },
      { uk: "Погано",    translit: "Pohano",    breakdown: "po-HA-no",      hint: "'г' is soft: 'ha', not 'ga'.",             en: "Bad" }
    ]
  },
  {
    id: "numbers",
    level: "words",
    title: "Numbers 1–10",
    description: "Count from one to ten.",
    items: [
      { uk: "один",    translit: "odyn",    breakdown: "o-DYN",     en: "one" },
      { uk: "два",     translit: "dva",     breakdown: "DVA",       en: "two" },
      { uk: "три",     translit: "try",     breakdown: "TRY",       en: "three" },
      { uk: "чотири",  translit: "chotyry", breakdown: "cho-TY-ry", en: "four" },
      { uk: "п'ять",   translit: "piat",    breakdown: "PIAT",      hint: "The ' keeps 'п' and 'я' separate: 'p-YAT'.", en: "five",  accept: ["пять"] },
      { uk: "шість",   translit: "shist",   breakdown: "SHIST",     hint: "'і' = 'ee'; ends with a soft 't'.",           en: "six" },
      { uk: "сім",     translit: "sim",     breakdown: "SIM",       en: "seven" },
      { uk: "вісім",   translit: "visim",   breakdown: "VI-sim",    en: "eight" },
      { uk: "дев'ять", translit: "deviat",  breakdown: "DE-viat",   hint: "Apostrophe separates: 'dev-YAT'.",            en: "nine",  accept: ["девять"] },
      { uk: "десять",  translit: "desiat",  breakdown: "DE-siat",   en: "ten" }
    ]
  },
  {
    id: "family",
    level: "words",
    title: "Family",
    description: "People closest to you.",
    items: [
      { uk: "мама",    translit: "mama",    breakdown: "MA-ma",    en: "mom" },
      { uk: "тато",    translit: "tato",    breakdown: "TA-to",    en: "dad" },
      { uk: "брат",    translit: "brat",    breakdown: "BRAT",     en: "brother" },
      { uk: "сестра",  translit: "sestra",  breakdown: "se-STRA",  hint: "Stress falls on the 2nd syllable.",  en: "sister" },
      { uk: "син",     translit: "syn",     breakdown: "SYN",      en: "son" },
      { uk: "донька",  translit: "donka",   breakdown: "DON'-ka",  hint: "'ь' softens 'н' into 'ny'.",          en: "daughter" },
      { uk: "бабуся",  translit: "babusia", breakdown: "ba-BU-sia", en: "grandma" },
      { uk: "дідусь",  translit: "didus",   breakdown: "di-DUS'",  hint: "'ь' softens the final 's'.",          en: "grandpa" },
      { uk: "друг",    translit: "druh",    breakdown: "DRUH",     hint: "'г' is a soft 'h', not 'g'.",         en: "friend (male)" },
      { uk: "подруга", translit: "podruha", breakdown: "POD-ru-ha", en: "friend (female)" }
    ]
  },
  {
    id: "colors",
    level: "words",
    title: "Colors",
    description: "Describe what you see.",
    items: [
      { uk: "червоний",    translit: "chervonyi",     breakdown: "cher-VO-nyi",      en: "red" },
      { uk: "синій",       translit: "synii",         breakdown: "SY-nii",           en: "blue" },
      { uk: "зелений",     translit: "zelenyi",       breakdown: "ze-LE-nyi",        en: "green" },
      { uk: "жовтий",      translit: "zhovtyi",       breakdown: "ZHOV-tyi",         hint: "'ж' = 'zh' like 's' in 'measure'.",  en: "yellow" },
      { uk: "чорний",      translit: "chornyi",       breakdown: "CHOR-nyi",         en: "black" },
      { uk: "білий",       translit: "bilyi",         breakdown: "BI-lyi",           en: "white" },
      { uk: "сірий",       translit: "siryi",         breakdown: "SI-ryi",           en: "gray" },
      { uk: "коричневий",  translit: "korychnevyi",   breakdown: "ko-RYCH-ne-vyi",   en: "brown" },
      { uk: "рожевий",     translit: "rozhevyi",      breakdown: "ro-ZHE-vyi",       en: "pink" },
      { uk: "помаранчевий",translit: "pomaranchevyi", breakdown: "po-ma-RAN-che-vyi",en: "orange" }
    ]
  },
  {
    id: "food",
    level: "words",
    title: "Food & Drink",
    description: "Words to survive at the table.",
    items: [
      { uk: "хліб",   translit: "khlib",   breakdown: "KHLIB",    hint: "'х' is a throaty 'kh' (like Scottish 'loch').", en: "bread" },
      { uk: "вода",   translit: "voda",    breakdown: "vo-DA",    en: "water" },
      { uk: "молоко", translit: "moloko",  breakdown: "mo-lo-KO", hint: "Stress falls on the LAST syllable.",            en: "milk" },
      { uk: "м'ясо",  translit: "miaso",   breakdown: "MIA-so",   hint: "Apostrophe separates: 'm-YA-so'.",              en: "meat", accept: ["мясо"] },
      { uk: "риба",   translit: "ryba",    breakdown: "RY-ba",    en: "fish" },
      { uk: "яблуко", translit: "yabluko", breakdown: "YAB-lu-ko",en: "apple" },
      { uk: "сир",    translit: "syr",     breakdown: "SYR",      en: "cheese" },
      { uk: "чай",    translit: "chai",    breakdown: "CHAI",     en: "tea" },
      { uk: "кава",   translit: "kava",    breakdown: "KA-va",    en: "coffee" },
      { uk: "сік",    translit: "sik",     breakdown: "SIK",      en: "juice" }
    ]
  },
  {
    id: "verbs",
    level: "words",
    title: "Common Verbs",
    description: "Basic actions (infinitive form).",
    items: [
      { uk: "бути",     translit: "buty",      breakdown: "BU-ty",      en: "to be" },
      { uk: "мати",     translit: "maty",      breakdown: "MA-ty",      en: "to have" },
      { uk: "робити",   translit: "robyty",    breakdown: "ro-BY-ty",   en: "to do / make" },
      { uk: "говорити", translit: "hovoryty",  breakdown: "ho-vo-RY-ty",hint: "3 syllables; stress the 3rd.",    en: "to speak" },
      { uk: "йти",      translit: "ity",       breakdown: "YTY",        hint: "Tricky: 'й' + 'т' + 'и'.",         en: "to go (on foot)" },
      { uk: "їсти",     translit: "isty",      breakdown: "IS-ty",      hint: "'ї' = 'yi'.",                      en: "to eat" },
      { uk: "пити",     translit: "pyty",      breakdown: "PY-ty",      en: "to drink" },
      { uk: "спати",    translit: "spaty",     breakdown: "SPA-ty",     en: "to sleep" },
      { uk: "бачити",   translit: "bachyty",   breakdown: "BA-chy-ty",  en: "to see" },
      { uk: "любити",   translit: "liubyty",   breakdown: "liu-BY-ty",  en: "to love / like" }
    ]
  },

  // ---------- LEVEL 2: SHORT PHRASES ----------
  {
    id: "small-talk",
    level: "phrases",
    title: "Small Talk",
    description: "Quick exchanges when you meet someone.",
    items: [
      { uk: "Як справи?",           translit: "Yak spravy?",       breakdown: "YAK SPRA-vy?",                en: "How are you?" },
      { uk: "Добре, дякую",          translit: "Dobre, diakuiu",    breakdown: "DOB-re, DIA-ku-iu",            en: "Good, thank you" },
      { uk: "Як тебе звати?",        translit: "Yak tebe zvaty?",   breakdown: "YAK te-BE ZVA-ty?",            en: "What's your name? (informal)" },
      { uk: "Мене звати Лінн",       translit: "Mene zvaty Linn",   breakdown: "me-NE ZVA-ty LIN",             en: "My name is Lynn" },
      { uk: "Приємно познайомитись", translit: "Pryiemno poznaiomytys", breakdown: "pry-YEM-no po-zna-YO-my-tys'", hint: "Longest word stresses the 3rd syllable.", en: "Nice to meet you" },
      { uk: "Звідки ти?",            translit: "Zvidky ty?",        breakdown: "ZVID-ky TY?",                  en: "Where are you from? (informal)" },
      { uk: "Я зі Сполучених Штатів",translit: "Ya zi Spoluchenykh Shtativ", breakdown: "YA zi spo-LU-che-nykh SHTA-tiv", en: "I'm from the United States" }
    ]
  },
  {
    id: "survival",
    level: "phrases",
    title: "Survival Phrases",
    description: "When you need help right now.",
    items: [
      { uk: "Я не розумію",          translit: "Ya ne rozumiiu",        breakdown: "YA ne ro-zu-MI-iu",           en: "I don't understand" },
      { uk: "Повторіть, будь ласка", translit: "Povtorit, bud laska",   breakdown: "pov-to-RIT', BUD' LAS-ka",    en: "Please repeat" },
      { uk: "Говоріть повільніше",   translit: "Hovorit povilnishe",    breakdown: "ho-vo-RIT' po-VIL'-ni-she",   en: "Speak more slowly" },
      { uk: "Я не знаю",             translit: "Ya ne znaiu",           breakdown: "YA ne ZNA-iu",                en: "I don't know" },
      { uk: "Допоможіть, будь ласка",translit: "Dopomozhit, bud laska", breakdown: "do-po-mo-ZHIT', BUD' LAS-ka", en: "Help me, please" },
      { uk: "Де туалет?",            translit: "De tualet?",            breakdown: "DE tu-a-LET?",                en: "Where is the bathroom?" },
      { uk: "Скільки це коштує?",    translit: "Skilky tse koshtuie?",  breakdown: "SKIL'-ky TSE KOSH-tu-ie?",    en: "How much does this cost?" }
    ]
  },
  {
    id: "at-the-cafe",
    level: "phrases",
    title: "At the Café",
    description: "Order food and drinks.",
    items: [
      { uk: "Я хочу каву",                translit: "Ya khochu kavu",             breakdown: "YA KHO-chu KA-vu",             en: "I want a coffee" },
      { uk: "Дайте мені чай, будь ласка", translit: "Daite meni chai, bud laska", breakdown: "DAI-te me-NI CHAI, BUD' LAS-ka", en: "Give me tea, please" },
      { uk: "У вас є меню?",              translit: "U vas ye meniu?",            breakdown: "u VAS YE me-NIU?",              en: "Do you have a menu?" },
      { uk: "Дуже смачно!",               translit: "Duzhe smachno!",             breakdown: "DU-zhe SMACH-no!",              en: "Very tasty!" },
      { uk: "Рахунок, будь ласка",        translit: "Rakhunok, bud laska",        breakdown: "ra-KHU-nok, BUD' LAS-ka",       en: "The check, please" },
      { uk: "Я вегетаріанець",            translit: "Ya vehetarianets",           breakdown: "YA ve-he-ta-ri-A-nets'",        en: "I am a vegetarian (male)" },
      { uk: "Я вегетаріанка",             translit: "Ya vehetarianka",            breakdown: "YA ve-he-ta-ri-AN-ka",          en: "I am a vegetarian (female)" }
    ]
  },

  // ---------- LEVEL 3: SENTENCES ----------
  {
    id: "about-me",
    level: "sentences",
    title: "Talking About Yourself",
    description: "Introduce yourself in full sentences.",
    items: [
      { uk: "Я вивчаю українську мову",      translit: "Ya vyvchaiu ukrainsku movu",      breakdown: "YA vyv-CHA-iu u-kra-YIN-s'ku MO-vu", en: "I am learning the Ukrainian language" },
      { uk: "Я трохи говорю українською",    translit: "Ya trokhy hovoriu ukrainskoiu",   breakdown: "YA TRO-khy ho-vo-RIU u-kra-YIN-s'ko-iu", en: "I speak a little Ukrainian" },
      { uk: "Я живу в Америці",              translit: "Ya zhyvu v Amerytsi",             breakdown: "YA zhy-VU v a-ME-ry-tsi",             en: "I live in America" },
      { uk: "Мені подобається ваша країна",  translit: "Meni podobaietsia vasha kraina",  breakdown: "me-NI po-do-BA-ie-tsia VA-sha kra-YI-na", en: "I like your country" },
      { uk: "Я хочу відвідати Київ",         translit: "Ya khochu vidvidaty Kyiv",        breakdown: "YA KHO-chu vid-VI-da-ty KY-yiv",      en: "I want to visit Kyiv" },
      { uk: "Мій улюблений колір — синій",   translit: "Mii uliublenyi kolir — synii",    breakdown: "MII u-LIU-ble-nyi KO-lir SY-nii",     en: "My favorite color is blue" },
      { uk: "У мене є брат і сестра",        translit: "U mene ye brat i sestra",         breakdown: "u ME-ne YE BRAT i se-STRA",            en: "I have a brother and a sister" }
    ]
  },
  {
    id: "getting-around",
    level: "sentences",
    title: "Getting Around",
    description: "Ask for directions and transport.",
    items: [
      { uk: "Де найближча станція метро?",    translit: "De naiblyzhcha stantsiia metro?",    breakdown: "DE nai-BLY-zhcha STAN-tsi-ia me-TRO?",   en: "Where is the nearest metro station?" },
      { uk: "Як дістатися до центру?",        translit: "Yak distatysia do tsentru?",         breakdown: "YAK di-STA-ty-sia do TSEN-tru?",          en: "How do I get to the center?" },
      { uk: "Скільки коштує квиток?",         translit: "Skilky koshtuie kvytok?",            breakdown: "SKIL'-ky KOSH-tu-ie kvy-TOK?",            en: "How much does a ticket cost?" },
      { uk: "Я заблукав",                     translit: "Ya zablukav",                        breakdown: "YA za-BLU-kav",                            en: "I am lost (male)" },
      { uk: "Я заблукала",                    translit: "Ya zablukala",                       breakdown: "YA za-blu-KA-la",                          en: "I am lost (female)" },
      { uk: "Будь ласка, покажіть на карті",  translit: "Bud laska, pokazhit na karti",       breakdown: "BUD' LAS-ka, po-ka-ZHIT' na KAR-ti",      en: "Please show me on the map" },
      { uk: "Де я можу знайти таксі?",        translit: "De ya mozhu znaity taksi?",          breakdown: "DE YA MO-zhu zna-YTY tak-SI?",            en: "Where can I find a taxi?" }
    ]
  },
  {
    id: "conversation",
    level: "sentences",
    title: "Everyday Conversation",
    description: "Longer sentences for real conversations.",
    items: [
      { uk: "Сьогодні дуже гарна погода",     translit: "Sohodni duzhe harna pohoda",     breakdown: "s'o-HOD-ni DU-zhe HAR-na po-HO-da",     en: "The weather is very nice today" },
      { uk: "Що ти робиш у вихідні?",         translit: "Shcho ty robysh u vykhidni?",    breakdown: "SHCHO TY RO-bysh u vy-KHID-ni?",         en: "What are you doing this weekend?" },
      { uk: "Я люблю читати книги ввечері",   translit: "Ya liubliu chytaty knyhy vvecheri", breakdown: "YA liu-BLIU chy-TA-ty KNY-hy VVE-che-ri", en: "I like reading books in the evening" },
      { uk: "Мені потрібна твоя допомога",    translit: "Meni potribna tvoia dopomoha",   breakdown: "me-NI po-TRIB-na tvo-YA do-po-MO-ha",    en: "I need your help" },
      { uk: "Я прийду додому о шостій",       translit: "Ya pryidu dodomu o shostii",     breakdown: "YA pry-DU do-DO-mu o SHOS-tii",          en: "I will come home at six" },
      { uk: "Це була дуже цікава розмова",    translit: "Tse bula duzhe tsikava rozmova", breakdown: "TSE bu-LA DU-zhe tsi-KA-va roz-MO-va",   en: "That was a very interesting conversation" },
      { uk: "Дякую за твою доброту",          translit: "Diakuiu za tvoiu dobrotu",       breakdown: "DIA-ku-iu za tvo-YU do-bro-TU",          en: "Thank you for your kindness" }
    ]
  }
];
