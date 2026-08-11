export interface SelectionCity {
  id: string;
  name: string;
}

export interface SelectionRegion {
  id: string;
  name: string;
  cities: SelectionCity[];
}

export interface SelectionCountry {
  code: string;
  name: string;
  regions: SelectionRegion[];
}

export const ARAB_COUNTRIES: SelectionCountry[] = [
  {
    code: "JO",
    name: "الأردن",
    regions: [
      {
        id: "jo-amman",
        name: "عمان",
        cities: [
          { id: "jo-amman-1", name: "غرب عمان" },
          { id: "jo-amman-2", name: "شرق عمان" },
          { id: "jo-amman-3", name: "شفا بدران" },
          { id: "jo-amman-4", name: "الجبيهة" },
          { id: "jo-amman-5", name: "تلاع العلي" }
        ]
      },
      {
        id: "jo-irbid",
        name: "إربد",
        cities: [
          { id: "jo-irbid-1", name: "وسط إربد" },
          { id: "jo-irbid-2", name: "بني عبيد" },
          { id: "jo-irbid-3", name: "الرمثا" }
        ]
      },
      {
        id: "jo-zarqa",
        name: "الزرقاء",
        cities: [
          { id: "jo-zarqa-1", name: "الزرقاء الجديدة" },
          { id: "jo-zarqa-2", name: "الرصيفة" }
        ]
      }
    ]
  },
  {
    code: "PS",
    name: "فلسطين",
    regions: [
      {
        id: "ps-jerusalem",
        name: "القدس",
        cities: [
          { id: "ps-jerusalem-1", name: "البلدة القديمة" },
          { id: "ps-jerusalem-2", name: "بيت حنينا" },
          { id: "ps-jerusalem-3", name: "شعفاط" }
        ]
      },
      {
        id: "ps-ramallah",
        name: "رام الله والبيرة",
        cities: [
          { id: "ps-ramallah-1", name: "رام الله" },
          { id: "ps-ramallah-2", name: "البيرة" },
          { id: "ps-ramallah-3", name: "بيتونيا" }
        ]
      },
      {
        id: "ps-gaza",
        name: "غزة",
        cities: [
          { id: "ps-gaza-1", name: "غزة الشمالية" },
          { id: "ps-gaza-2", name: "خانيونس" },
          { id: "ps-gaza-3", name: "رفح" }
        ]
      }
    ]
  },
  {
    code: "SA",
    name: "السعودية",
    regions: [
      {
        id: "sa-riyadh",
        name: "الرياض",
        cities: [
          { id: "sa-riyadh-1", name: "الرياض - شمال" },
          { id: "sa-riyadh-2", name: "الرياض - شرق" },
          { id: "sa-riyadh-3", name: "الرياض - جنوب" },
          { id: "sa-riyadh-4", name: "الخرج" }
        ]
      },
      {
        id: "sa-makkah",
        name: "مكة المكرمة",
        cities: [
          { id: "sa-makkah-1", name: "جدة" },
          { id: "sa-makkah-2", name: "مكة المكرمة" },
          { id: "sa-makkah-3", name: "الطائف" }
        ]
      },
      {
        id: "sa-eastern",
        name: "المنطقة الشرقية",
        cities: [
          { id: "sa-eastern-1", name: "الدمام" },
          { id: "sa-eastern-2", name: "الخبر" },
          { id: "sa-eastern-3", name: "الجبيل" },
          { id: "sa-eastern-4", name: "الأحساء" }
        ]
      }
    ]
  },
  {
    code: "AE",
    name: "الإمارات العربية المتحدة",
    regions: [
      {
        id: "ae-dubai",
        name: "دبي",
        cities: [
          { id: "ae-dubai-1", name: "ديرة" },
          { id: "ae-dubai-2", name: "بر دبي" },
          { id: "ae-dubai-3", name: "مرسى دبي (مارينا)" }
        ]
      },
      {
        id: "ae-abudhabi",
        name: "أبوظبي",
        cities: [
          { id: "ae-abudhabi-1", name: "وسط المدينة" },
          { id: "ae-abudhabi-2", name: "العين" },
          { id: "ae-abudhabi-3", name: "الظفرة" }
        ]
      },
      {
        id: "ae-sharjah",
        name: "الشارقة",
        cities: [
          { id: "ae-sharjah-1", name: "المجاز" },
          { id: "ae-sharjah-2", name: "الذيد" }
        ]
      }
    ]
  },
  {
    code: "QA",
    name: "قطر",
    regions: [
      {
        id: "qa-doha",
        name: "الدوحة",
        cities: [
          { id: "qa-doha-1", name: "السد" },
          { id: "qa-doha-2", name: "اللؤلؤة" },
          { id: "qa-doha-3", name: "الدفنة" }
        ]
      },
      {
        id: "qa-rayyan",
        name: "الريان",
        cities: [
          { id: "qa-rayyan-1", name: "معيذر" },
          { id: "qa-rayyan-2", name: "الغرافة" }
        ]
      }
    ]
  },
  {
    code: "KW",
    name: "الكويت",
    regions: [
      {
        id: "kw-asimah",
        name: "العاصمة",
        cities: [
          { id: "kw-asimah-1", name: "شرق" },
          { id: "kw-asimah-2", name: "القبلة" },
          { id: "kw-asimah-3", name: "الشويخ" }
        ]
      },
      {
        id: "kw-hawalli",
        name: "حوّلي",
        cities: [
          { id: "kw-hawalli-1", name: "السالمية" },
          { id: "kw-hawalli-2", name: "الجابرية" },
          { id: "kw-hawalli-3", name: "سلوى" }
        ]
      }
    ]
  },
  {
    code: "BH",
    name: "البحرين",
    regions: [
      {
        id: "bh-manama",
        name: "محافظة العاصمة",
        cities: [
          { id: "bh-manama-1", name: "المنامة" },
          { id: "bh-manama-2", name: "الجفير" },
          { id: "bh-manama-3", name: "ضاحية السيف" }
        ]
      },
      {
        id: "bh-muharraq",
        name: "محافظة المحرق",
        cities: [
          { id: "bh-muharraq-1", name: "المحرق" },
          { id: "bh-muharraq-2", name: "البسيتين" }
        ]
      }
    ]
  },
  {
    code: "OM",
    name: "عُمان",
    regions: [
      {
        id: "om-muscat",
        name: "مسقط",
        cities: [
          { id: "om-muscat-1", name: "السيب" },
          { id: "om-muscat-2", name: "المطرح" },
          { id: "om-muscat-3", name: "بوشر" }
        ]
      },
      {
        id: "om-dhofar",
        name: "ظفار",
        cities: [
          { id: "om-dhofar-1", name: "صلالة" },
          { id: "om-dhofar-2", name: "طاقة" }
        ]
      }
    ]
  },
  {
    code: "YE",
    name: "اليمن",
    regions: [
      {
        id: "ye-sanaa",
        name: "صنعاء",
        cities: [
          { id: "ye-sanaa-1", name: "وسط العاصمة" },
          { id: "ye-sanaa-2", name: "حدة" }
        ]
      },
      {
        id: "ye-aden",
        name: "عدن",
        cities: [
          { id: "ye-aden-1", name: "كريتر" },
          { id: "ye-aden-2", name: "المنصورة" },
          { id: "ye-aden-3", name: "الشيخ عثمان" }
        ]
      }
    ]
  },
  {
    code: "IQ",
    name: "العراق",
    regions: [
      {
        id: "iq-baghdad",
        name: "بغداد",
        cities: [
          { id: "iq-baghdad-1", name: "الكرادة" },
          { id: "iq-baghdad-2", name: "المنصور" },
          { id: "iq-baghdad-3", name: "الأعظمية" }
        ]
      },
      {
        id: "iq-erbil",
        name: "أربيل",
        cities: [
          { id: "iq-erbil-1", name: "وسط أربيل" },
          { id: "iq-erbil-2", name: "عينكاوة" }
        ]
      },
      {
        id: "iq-basra",
        name: "البصرة",
        cities: [
          { id: "iq-basra-1", name: "العشار" },
          { id: "iq-basra-2", name: "العباسية" }
        ]
      }
    ]
  },
  {
    code: "SY",
    name: "سوريا",
    regions: [
      {
        id: "sy-damascus",
        name: "دمشق",
        cities: [
          { id: "sy-damascus-1", name: "أبو رمانة" },
          { id: "sy-damascus-2", name: "المالكي" },
          { id: "sy-damascus-3", name: "المزة" }
        ]
      },
      {
        id: "sy-aleppo",
        name: "حلب",
        cities: [
          { id: "sy-aleppo-1", name: "الجميلية" },
          { id: "sy-aleppo-2", name: "المحافظة" }
        ]
      }
    ]
  },
  {
    code: "LB",
    name: "لبنان",
    regions: [
      {
        id: "lb-beirut",
        name: "بيروت",
        cities: [
          { id: "lb-beirut-1", name: "الحمرا" },
          { id: "lb-beirut-2", name: "الأشرفية" },
          { id: "lb-beirut-3", name: "وسط بيروت" }
        ]
      },
      {
        id: "lb-north",
        name: "الشمال",
        cities: [
          { id: "lb-north-1", name: "طرابلس" },
          { id: "lb-north-2", name: "البترون" }
        ]
      }
    ]
  },
  {
    code: "EG",
    name: "مصر",
    regions: [
      {
        id: "eg-cairo",
        name: "القاهرة",
        cities: [
          { id: "eg-cairo-1", name: "مصر الجديدة" },
          { id: "eg-cairo-2", name: "التجمع الخامس" },
          { id: "eg-cairo-3", name: "المعادي" },
          { id: "eg-cairo-4", name: "شبرا" }
        ]
      },
      {
        id: "eg-giza",
        name: "الجيزة",
        cities: [
          { id: "eg-giza-1", name: "المهندسين" },
          { id: "eg-giza-2", name: "الدقي" },
          { id: "eg-giza-3", name: "السادس من أكتوبر" }
        ]
      },
      {
        id: "eg-alex",
        name: "الإسكندرية",
        cities: [
          { id: "eg-alex-1", name: "سموحة" },
          { id: "eg-alex-2", name: "المنتزة" },
          { id: "eg-alex-3", name: "محرم بك" }
        ]
      }
    ]
  },
  {
    code: "SD",
    name: "السودان",
    regions: [
      {
        id: "sd-khartoum",
        name: "الخرطوم",
        cities: [
          { id: "sd-khartoum-1", name: "الرياض السودانية" },
          { id: "sd-khartoum-2", name: "الخرطوم 2" }
        ]
      }
    ]
  },
  {
    code: "LY",
    name: "ليبيا",
    regions: [
      {
        id: "ly-tripoli",
        name: "طرابلس",
        cities: [
          { id: "ly-tripoli-1", name: "حي الأندلس" },
          { id: "ly-tripoli-2", name: "قرجي" }
        ]
      }
    ]
  },
  {
    code: "TN",
    name: "تونس",
    regions: [
      {
        id: "tn-tunis",
        name: "محافظة تونس",
        cities: [
          { id: "tn-tunis-1", name: "قرطاج" },
          { id: "tn-tunis-2", name: "المرسى" },
          { id: "tn-tunis-3", name: "حي النصر" }
        ]
      }
    ]
  },
  {
    code: "DZ",
    name: "الجزائر",
    regions: [
      {
        id: "dz-algiers",
        name: "الجزائر العاصمة",
        cities: [
          { id: "dz-algiers-1", name: "دالي إبراهيم" },
          { id: "dz-algiers-2", name: "سيدي يحيى" },
          { id: "dz-algiers-3", name: "باب الواد" }
        ]
      }
    ]
  },
  {
    code: "MA",
    name: "المغرب",
    regions: [
      {
        id: "ma-casablanca",
        name: "الدار البيضاء الكبرى",
        cities: [
          { id: "ma-casablanca-1", name: "المعاضيد" },
          { id: "ma-casablanca-2", name: "عين دياب" },
          { id: "ma-casablanca-3", name: "وسط المدينة" }
        ]
      },
      {
        id: "ma-rabat",
        name: "الرباط سلا القنيطرة",
        cities: [
          { id: "ma-rabat-1", name: "أكدال" },
          { id: "ma-rabat-2", name: "السويسي" },
          { id: "ma-rabat-3", name: "حي الرياض" }
        ]
      }
    ]
  },
  {
    code: "MR",
    name: "موريتانيا",
    regions: [
      {
        id: "mr-nouakchott",
        name: "نواكشوط",
        cities: [
          { id: "mr-nouakchott-1", name: "تفرغ زينة" },
          { id: "mr-nouakchott-2", name: "الميناء" }
        ]
      }
    ]
  },
  {
    code: "SO",
    name: "الصومال",
    regions: [
      {
        id: "so-banaadir",
        name: "بنادر",
        cities: [
          { id: "so-mogadishu", name: "مقديشو" }
        ]
      }
    ]
  },
  {
    code: "DJ",
    name: "جيبوتي",
    regions: [
      {
        id: "dj-djibouti",
        name: "إقليم جيبوتي",
        cities: [
          { id: "dj-djibouti-1", name: "جيبوتي العاصمة" }
        ]
      }
    ]
  },
  {
    code: "KM",
    name: "جزر القمر",
    regions: [
      {
        id: "km-grande-comore",
        name: "جزيرة القمر الكبرى",
        cities: [
          { id: "km-moroni", name: "موروني" }
        ]
      }
    ]
  }
];
