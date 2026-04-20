// Lesson data for Ukrainian learner.
// Each item: { uk: Cyrillic text, translit: Latin transliteration, en: English meaning, accept: optional alternate Cyrillic accepted answers }
// Lessons are ordered from easiest to hardest: single words -> short phrases -> full sentences.

const LESSONS = [
  // ---------- LEVEL 1: WORDS ----------
  {
    id: "greetings",
    level: "words",
    title: "Greetings",
    description: "The first words you'll use every day.",
    items: [
      { uk: "Привіт",           translit: "Pryvit",           en: "Hi / Hello (informal)" },
      { uk: "Добрий день",       translit: "Dobryi den",       en: "Good day / Hello" },
      { uk: "Доброго ранку",     translit: "Dobroho ranku",    en: "Good morning" },
      { uk: "Добрий вечір",      translit: "Dobryi vechir",    en: "Good evening" },
      { uk: "На добраніч",       translit: "Na dobranich",     en: "Good night" },
      { uk: "До побачення",      translit: "Do pobachennia",   en: "Goodbye" },
      { uk: "Бувай",             translit: "Buvai",            en: "Bye (informal)" }
    ]
  },
  {
    id: "essentials",
    level: "words",
    title: "Essential Words",
    description: "Yes, no, please, thank you — the building blocks.",
    items: [
      { uk: "Так",            translit: "Tak",        en: "Yes" },
      { uk: "Ні",             translit: "Ni",         en: "No" },
      { uk: "Будь ласка",      translit: "Bud laska",  en: "Please / You're welcome" },
      { uk: "Дякую",          translit: "Diakuiu",    en: "Thank you" },
      { uk: "Вибачте",        translit: "Vybachte",   en: "Sorry / Excuse me" },
      { uk: "Добре",          translit: "Dobre",      en: "Good / Okay" },
      { uk: "Погано",         translit: "Pohano",     en: "Bad" }
    ]
  },
  {
    id: "numbers",
    level: "words",
    title: "Numbers 1–10",
    description: "Count from one to ten.",
    items: [
      { uk: "один",    translit: "odyn",    en: "one" },
      { uk: "два",     translit: "dva",     en: "two" },
      { uk: "три",     translit: "try",     en: "three" },
      { uk: "чотири",  translit: "chotyry", en: "four" },
      { uk: "п'ять",   translit: "piat",    en: "five",  accept: ["пять"] },
      { uk: "шість",   translit: "shist",   en: "six" },
      { uk: "сім",     translit: "sim",     en: "seven" },
      { uk: "вісім",   translit: "visim",   en: "eight" },
      { uk: "дев'ять", translit: "deviat",  en: "nine",  accept: ["девять"] },
      { uk: "десять",  translit: "desiat",  en: "ten" }
    ]
  },
  {
    id: "family",
    level: "words",
    title: "Family",
    description: "People closest to you.",
    items: [
      { uk: "мама",    translit: "mama",    en: "mom" },
      { uk: "тато",    translit: "tato",    en: "dad" },
      { uk: "брат",    translit: "brat",    en: "brother" },
      { uk: "сестра",  translit: "sestra",  en: "sister" },
      { uk: "син",     translit: "syn",     en: "son" },
      { uk: "донька",  translit: "donka",   en: "daughter" },
      { uk: "бабуся",  translit: "babusia", en: "grandma" },
      { uk: "дідусь",  translit: "didus",   en: "grandpa" },
      { uk: "друг",    translit: "druh",    en: "friend (male)" },
      { uk: "подруга", translit: "podruha", en: "friend (female)" }
    ]
  },
  {
    id: "colors",
    level: "words",
    title: "Colors",
    description: "Describe what you see.",
    items: [
      { uk: "червоний",    translit: "chervonyi",    en: "red" },
      { uk: "синій",       translit: "synii",        en: "blue" },
      { uk: "зелений",     translit: "zelenyi",      en: "green" },
      { uk: "жовтий",      translit: "zhovtyi",      en: "yellow" },
      { uk: "чорний",      translit: "chornyi",      en: "black" },
      { uk: "білий",       translit: "bilyi",        en: "white" },
      { uk: "сірий",       translit: "siryi",        en: "gray" },
      { uk: "коричневий",  translit: "korychnevyi",  en: "brown" },
      { uk: "рожевий",     translit: "rozhevyi",     en: "pink" },
      { uk: "помаранчевий",translit: "pomaranchevyi",en: "orange" }
    ]
  },
  {
    id: "food",
    level: "words",
    title: "Food & Drink",
    description: "Words to survive at the table.",
    items: [
      { uk: "хліб",    translit: "khlib",   en: "bread" },
      { uk: "вода",    translit: "voda",    en: "water" },
      { uk: "молоко",  translit: "moloko",  en: "milk" },
      { uk: "м'ясо",   translit: "miaso",   en: "meat", accept: ["мясо"] },
      { uk: "риба",    translit: "ryba",    en: "fish" },
      { uk: "яблуко",  translit: "yabluko", en: "apple" },
      { uk: "сир",     translit: "syr",     en: "cheese" },
      { uk: "чай",     translit: "chai",    en: "tea" },
      { uk: "кава",    translit: "kava",    en: "coffee" },
      { uk: "сік",     translit: "sik",     en: "juice" }
    ]
  },
  {
    id: "verbs",
    level: "words",
    title: "Common Verbs",
    description: "Basic actions (infinitive form).",
    items: [
      { uk: "бути",     translit: "buty",      en: "to be" },
      { uk: "мати",     translit: "maty",      en: "to have" },
      { uk: "робити",   translit: "robyty",    en: "to do / make" },
      { uk: "говорити", translit: "hovoryty",  en: "to speak" },
      { uk: "йти",      translit: "ity",       en: "to go (on foot)" },
      { uk: "їсти",     translit: "isty",      en: "to eat" },
      { uk: "пити",     translit: "pyty",      en: "to drink" },
      { uk: "спати",    translit: "spaty",     en: "to sleep" },
      { uk: "бачити",   translit: "bachyty",   en: "to see" },
      { uk: "любити",   translit: "liubyty",   en: "to love / like" }
    ]
  },

  // ---------- LEVEL 2: SHORT PHRASES ----------
  {
    id: "small-talk",
    level: "phrases",
    title: "Small Talk",
    description: "Quick exchanges when you meet someone.",
    items: [
      { uk: "Як справи?",                translit: "Yak spravy?",                en: "How are you?" },
      { uk: "Добре, дякую",               translit: "Dobre, diakuiu",             en: "Good, thank you" },
      { uk: "Як тебе звати?",             translit: "Yak tebe zvaty?",            en: "What's your name? (informal)" },
      { uk: "Мене звати Лінн",            translit: "Mene zvaty Linn",            en: "My name is Lynn" },
      { uk: "Приємно познайомитись",      translit: "Pryiemno poznaiomytys",      en: "Nice to meet you" },
      { uk: "Звідки ти?",                 translit: "Zvidky ty?",                 en: "Where are you from? (informal)" },
      { uk: "Я зі Сполучених Штатів",     translit: "Ya zi Spoluchenykh Shtativ", en: "I'm from the United States" }
    ]
  },
  {
    id: "survival",
    level: "phrases",
    title: "Survival Phrases",
    description: "When you need help right now.",
    items: [
      { uk: "Я не розумію",               translit: "Ya ne rozumiiu",             en: "I don't understand" },
      { uk: "Повторіть, будь ласка",      translit: "Povtorit, bud laska",        en: "Please repeat" },
      { uk: "Говоріть повільніше",        translit: "Hovorit povilnishe",         en: "Speak more slowly" },
      { uk: "Я не знаю",                  translit: "Ya ne znaiu",                en: "I don't know" },
      { uk: "Допоможіть, будь ласка",     translit: "Dopomozhit, bud laska",      en: "Help me, please" },
      { uk: "Де туалет?",                 translit: "De tualet?",                 en: "Where is the bathroom?" },
      { uk: "Скільки це коштує?",         translit: "Skilky tse koshtuie?",       en: "How much does this cost?" }
    ]
  },
  {
    id: "at-the-cafe",
    level: "phrases",
    title: "At the Café",
    description: "Order food and drinks.",
    items: [
      { uk: "Я хочу каву",                 translit: "Ya khochu kavu",             en: "I want a coffee" },
      { uk: "Дайте мені чай, будь ласка",  translit: "Daite meni chai, bud laska", en: "Give me tea, please" },
      { uk: "У вас є меню?",               translit: "U vas ye meniu?",            en: "Do you have a menu?" },
      { uk: "Дуже смачно!",                translit: "Duzhe smachno!",             en: "Very tasty!" },
      { uk: "Рахунок, будь ласка",         translit: "Rakhunok, bud laska",        en: "The check, please" },
      { uk: "Я вегетаріанець",             translit: "Ya vehetarianets",           en: "I am a vegetarian (male)" },
      { uk: "Я вегетаріанка",              translit: "Ya vehetarianka",            en: "I am a vegetarian (female)" }
    ]
  },

  // ---------- LEVEL 3: SENTENCES ----------
  {
    id: "about-me",
    level: "sentences",
    title: "Talking About Yourself",
    description: "Introduce yourself in full sentences.",
    items: [
      { uk: "Я вивчаю українську мову",           translit: "Ya vyvchaiu ukrainsku movu",         en: "I am learning the Ukrainian language" },
      { uk: "Я трохи говорю українською",         translit: "Ya trokhy hovoriu ukrainskoiu",      en: "I speak a little Ukrainian" },
      { uk: "Я живу в Америці",                   translit: "Ya zhyvu v Amerytsi",                en: "I live in America" },
      { uk: "Мені подобається ваша країна",       translit: "Meni podobaietsia vasha kraina",     en: "I like your country" },
      { uk: "Я хочу відвідати Київ",              translit: "Ya khochu vidvidaty Kyiv",           en: "I want to visit Kyiv" },
      { uk: "Мій улюблений колір — синій",        translit: "Mii uliublenyi kolir — synii",       en: "My favorite color is blue" },
      { uk: "У мене є брат і сестра",             translit: "U mene ye brat i sestra",            en: "I have a brother and a sister" }
    ]
  },
  {
    id: "getting-around",
    level: "sentences",
    title: "Getting Around",
    description: "Ask for directions and transport.",
    items: [
      { uk: "Де найближча станція метро?",            translit: "De naiblyzhcha stantsiia metro?",        en: "Where is the nearest metro station?" },
      { uk: "Як дістатися до центру?",                translit: "Yak distatysia do tsentru?",             en: "How do I get to the center?" },
      { uk: "Скільки коштує квиток?",                 translit: "Skilky koshtuie kvytok?",                en: "How much does a ticket cost?" },
      { uk: "Я заблукав",                             translit: "Ya zablukav",                            en: "I am lost (male)" },
      { uk: "Я заблукала",                            translit: "Ya zablukala",                           en: "I am lost (female)" },
      { uk: "Будь ласка, покажіть на карті",          translit: "Bud laska, pokazhit na karti",           en: "Please show me on the map" },
      { uk: "Де я можу знайти таксі?",                translit: "De ya mozhu znaity taksi?",              en: "Where can I find a taxi?" }
    ]
  },
  {
    id: "conversation",
    level: "sentences",
    title: "Everyday Conversation",
    description: "Longer sentences for real conversations.",
    items: [
      { uk: "Сьогодні дуже гарна погода",                 translit: "Sohodni duzhe harna pohoda",              en: "The weather is very nice today" },
      { uk: "Що ти робиш у вихідні?",                     translit: "Shcho ty robysh u vykhidni?",             en: "What are you doing this weekend?" },
      { uk: "Я люблю читати книги ввечері",               translit: "Ya liubliu chytaty knyhy vvecheri",       en: "I like reading books in the evening" },
      { uk: "Мені потрібна твоя допомога",                translit: "Meni potribna tvoia dopomoha",            en: "I need your help" },
      { uk: "Я прийду додому о шостій",                   translit: "Ya pryidu dodomu o shostii",              en: "I will come home at six" },
      { uk: "Це була дуже цікава розмова",                translit: "Tse bula duzhe tsikava rozmova",          en: "That was a very interesting conversation" },
      { uk: "Дякую за твою доброту",                      translit: "Diakuiu za tvoiu dobrotu",                en: "Thank you for your kindness" }
    ]
  }
];
