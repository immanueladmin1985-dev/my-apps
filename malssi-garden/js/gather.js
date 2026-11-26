// 채집 (말씨정원). 마을에서 나무 흔들기·바위 두드리기·줍기·화석 캐기·곤충 잡기로 모은 것을 가방에 담는다.
// 주울 때마다 배우는 말로 이름을 알려 주고, 박물관 도감에 기록한다. 재료(나뭇가지·통나무·돌·점토·금)는 집 넓히기에 쓴다.
(function () {
  var M = window.M, $ = M.$, esc = M.esc, H = 3600 * 1000;
  // id: [한국어, 분류, 값, ja, zh(글자|병음), en]
  var RAW = {
    apple: ['사과', 'fruit', 12, 'りんご', '苹果|píngguǒ', 'apple'], orange: ['오렌지', 'fruit', 12, 'オレンジ', '橙子|chéngzi', 'orange'],
    peach: ['복숭아', 'fruit', 14, 'もも', '桃子|táozi', 'peach'], pear: ['배', 'fruit', 14, 'なし', '梨|lí', 'pear'], cherry: ['체리', 'fruit', 16, 'さくらんぼ', '樱桃|yīngtáo', 'cherry'],
    branch: ['나뭇가지', 'forest', 3, 'えだ', '树枝|shùzhī', 'branch'], log: ['통나무', 'forest', 10, 'まるた', '木头|mùtou', 'log'], acorn: ['도토리', 'forest', 5, 'どんぐり', '橡子|xiàngzi', 'acorn'],
    pinecone: ['솔방울', 'forest', 5, 'まつぼっくり', '松果|sōngguǒ', 'pinecone'], leaf: ['낙엽', 'forest', 2, 'おちば', '落叶|luòyè', 'fallen leaf'],
    'mush-red': ['빨간 버섯', 'forest', 15, 'あかいきのこ', '红蘑菇|hóng mógu', 'red mushroom'], 'mush-brown': ['표고버섯', 'forest', 12, 'しいたけ', '香菇|xiānggū', 'shiitake'],
    'mush-white': ['양송이', 'forest', 10, 'マッシュルーム', '白蘑菇|bái mógu', 'white mushroom'], flowers: ['들꽃 다발', 'forest', 8, 'はなたば', '花束|huāshù', 'bouquet'],
    clover: ['네잎클로버', 'forest', 40, 'よつばのクローバー', '四叶草|sìyècǎo', 'four-leaf clover'],
    stone: ['돌', 'mineral', 4, 'いし', '石头|shítou', 'stone'], pebble: ['조약돌', 'mineral', 6, 'こいし', '小石子|xiǎo shízǐ', 'pebble'], clay: ['점토', 'mineral', 6, 'ねんど', '黏土|niántǔ', 'clay'],
    gold: ['금광석', 'mineral', 120, 'きん', '金子|jīnzi', 'gold'], gem: ['보석', 'mineral', 200, 'ほうせき', '宝石|bǎoshí', 'gem'],
    scallop: ['가리비', 'sea', 8, 'ほたて', '扇贝|shànbèi', 'scallop'], conch: ['소라', 'sea', 12, 'まきがい', '海螺|hǎiluó', 'conch'], coral: ['산호', 'sea', 25, 'さんご', '珊瑚|shānhú', 'coral'],
    starfish: ['불가사리', 'sea', 15, 'ひとで', '海星|hǎixīng', 'starfish'], pearl: ['진주 조개', 'sea', 150, 'しんじゅ', '珍珠|zhēnzhū', 'pearl'], sanddollar: ['모래 달러', 'sea', 10, 'カシパン', '沙钱|shāqián', 'sand dollar'],
    glass: ['바다 유리', 'sea', 18, 'シーグラス', '海玻璃|hǎi bōli', 'sea glass'], crab: ['게', 'sea', 20, 'かに', '螃蟹|pángxiè', 'crab'], bottle: ['유리병 편지', 'sea', 60, 'ボトルメール', '漂流瓶|piāoliúpíng', 'message in a bottle'],
    seaweed: ['해초', 'sea', 4, 'かいそう', '海草|hǎicǎo', 'seaweed'],
    yellowbf: ['노랑나비', 'bug', 25, 'きいろいちょうちょ', '黄蝴蝶|huáng húdié', 'yellow butterfly'], bluebf: ['파랑나비', 'bug', 35, 'あおいちょうちょ', '蓝蝴蝶|lán húdié', 'blue butterfly'],
    ladybug: ['무당벌레', 'bug', 20, 'てんとうむし', '瓢虫|piáochóng', 'ladybug'], bee: ['꿀벌', 'bug', 30, 'みつばち', '蜜蜂|mìfēng', 'bee'], dragonfly: ['잠자리', 'bug', 30, 'とんぼ', '蜻蜓|qīngtíng', 'dragonfly'],
    beetle: ['장수풍뎅이', 'bug', 80, 'カブトムシ', '独角仙|dújiǎoxiān', 'rhinoceros beetle'], stag: ['사슴벌레', 'bug', 90, 'クワガタ', '锹形虫|qiāoxíngchóng', 'stag beetle'],
    firefly: ['반딧불이', 'bug', 60, 'ほたる', '萤火虫|yínghuǒchóng', 'firefly'], cicada: ['매미', 'bug', 25, 'セミ', '蝉|chán', 'cicada'], snail: ['달팽이', 'bug', 15, 'かたつむり', '蜗牛|wōniú', 'snail'],
    bone: ['뼈 화석', 'fossil', 80, 'ほねのかせき', '骨头化石|gǔtou huàshí', 'bone fossil'], ammonite: ['암모나이트', 'fossil', 100, 'アンモナイト', '菊石|júshí', 'ammonite'],
    footprint: ['발자국 화석', 'fossil', 90, 'あしあとのかせき', '脚印化石|jiǎoyìn huàshí', 'footprint fossil'], trilobite: ['삼엽충', 'fossil', 110, 'さんようちゅう', '三叶虫|sānyèchóng', 'trilobite'],
    tooth: ['이빨 화석', 'fossil', 120, 'きばのかせき', '牙齿化石|yáchǐ huàshí', 'tooth fossil'], leaffos: ['나뭇잎 화석', 'fossil', 70, 'このはのかせき', '叶子化石|yèzi huàshí', 'leaf fossil'],
    diamond: ['다이아몬드', 'mineral', 300, 'ダイヤモンド', '钻石|zuànshí', 'diamond'], ruby: ['루비', 'mineral', 220, 'ルビー', '红宝石|hóngbǎoshí', 'ruby'],
    sapphire: ['사파이어', 'mineral', 220, 'サファイア', '蓝宝石|lánbǎoshí', 'sapphire'], silver: ['은광석', 'mineral', 60, 'ぎん', '银|yín', 'silver'],
    oldkey: ['낡은 열쇠', 'fossil', 90, 'ふるいかぎ', '旧钥匙|jiù yàoshi', 'old key'], skull: ['공룡 두개골', 'fossil', 400, 'きょうりゅうのずがいこつ', '恐龙头骨|kǒnglóng tóugǔ', 'dinosaur skull'],
    mammoth: ['매머드 이빨', 'fossil', 250, 'マンモスのきば', '猛犸象牙|měngmǎ xiàngyá', 'mammoth tusk'],
    amber: ['호박', 'fossil', 150, 'こはく', '琥珀|hǔpò', 'amber'], coin: ['옛날 동전', 'fossil', 130, 'ふるいコイン', '古钱币|gǔ qiánbì', 'old coin']
  };
  var IMG = { apple: 'it-apple', orange: 'it-orange', peach: 'it-peach', pear: 'it-pear', cherry: 'it-cherry', branch: 'it-branch', log: 'it-log', acorn: 'it-acorn', pinecone: 'it-pinecone', leaf: 'it-leaf',
    'mush-red': 'it-mush-red', 'mush-brown': 'it-mush-brown', 'mush-white': 'it-mush-white', flowers: 'it-flowers', clover: 'it-clover', stone: 'it-stone', pebble: 'it-pebble', clay: 'it-clay', gold: 'it-gold', gem: 'it-gem',
    bone: 'fos-bone', ammonite: 'fos-ammonite', footprint: 'fos-footprint', trilobite: 'fos-trilobite', tooth: 'fos-tooth', leaffos: 'fos-leaf', amber: 'fos-amber', coin: 'fos-coin', diamond: 'dg-diamond', ruby: 'dg-ruby', sapphire: 'dg-sapphire', silver: 'dg-silver', oldkey: 'dg-key', skull: 'dg-skull', mammoth: 'dg-mammoth' };
  var ITEMS = {};
  Object.keys(RAW).forEach(function (id) {
    var r = RAW[id], z = r[4].split('|');
    ITEMS[id] = { id: id, ko: r[0], cat: r[1], price: r[2], ja: [r[3], ''], zh: [z[0], z[1]], en: [r[5], ''], img: 'img/w/' + (IMG[id] || (r[1] === 'sea' ? 'sea-' + id : r[1] === 'bug' ? 'bug-' + id : 'it-' + id)) + '.png' };
  });

  // 5×5 확장 (그림 파일 이름 = id)
  var RAW2 = {
    'bug-monarch': ['제왕나비', 'bug', 40, 'オオカバマダラ', '帝王蝶|dìwángdié', 'monarch butterfly'], 'bug-whitebf': ['흰나비', 'bug', 25, 'モンシロチョウ', '菜粉蝶|càifěndié', 'cabbage white'],
    'bug-swallowtail': ['호랑나비', 'bug', 45, 'アゲハチョウ', '凤蝶|fèngdié', 'swallowtail'], 'bug-peacock': ['공작나비', 'bug', 60, 'クジャクチョウ', '孔雀蛱蝶|kǒngquè jiádié', 'peacock butterfly'],
    'bug-moth': ['나방', 'bug', 30, 'が', '蛾子|ézi', 'moth'], 'bug-grasshopper': ['메뚜기', 'bug', 20, 'バッタ', '蚂蚱|màzha', 'grasshopper'],
    'bug-cricket': ['귀뚜라미', 'bug', 25, 'コオロギ', '蟋蟀|xīshuài', 'cricket'], 'bug-mantis': ['사마귀', 'bug', 50, 'カマキリ', '螳螂|tángláng', 'praying mantis'],
    'bug-ricegrass': ['방아깨비', 'bug', 35, 'ショウリョウバッタ', '中华剑角蝗|zhōnghuá jiànjiǎohuáng', 'long-headed grasshopper'], 'bug-katydid': ['여치', 'bug', 35, 'キリギリス', '蝈蝈|guōguo', 'katydid'],
    'bug-longhorn': ['하늘소', 'bug', 70, 'カミキリムシ', '天牛|tiānniú', 'longhorn beetle'], 'bug-chafer': ['풍뎅이', 'bug', 40, 'コガネムシ', '金龟子|jīnguīzǐ', 'chafer'],
    'bug-jewel': ['비단벌레', 'bug', 150, 'タマムシ', '吉丁虫|jídīngchóng', 'jewel beetle'], 'bug-higurashi': ['쓰르라미', 'bug', 45, 'ヒグラシ', '暮蝉|mùchán', 'evening cicada'],
    'bug-stick': ['대벌레', 'bug', 60, 'ナナフシ', '竹节虫|zhújiéchóng', 'stick insect'], 'bug-strider': ['소금쟁이', 'bug', 25, 'アメンボ', '水黾|shuǐmǐn', 'water strider'],
    'bug-divingbeetle': ['물방개', 'bug', 70, 'ゲンゴロウ', '龙虱|lóngshī', 'diving beetle'], 'bug-redfly': ['고추잠자리', 'bug', 40, 'アカトンボ', '红蜻蜓|hóng qīngtíng', 'red dragonfly'],
    'bug-waterbug': ['물장군', 'bug', 120, 'タガメ', '田鳖|tiánbiē', 'giant water bug'], 'bug-damselfly': ['실잠자리', 'bug', 30, 'イトトンボ', '豆娘|dòuniáng', 'damselfly'],
    'bug-ant': ['개미', 'bug', 8, 'アリ', '蚂蚁|mǎyǐ', 'ant'], 'bug-spider': ['거미', 'bug', 20, 'クモ', '蜘蛛|zhīzhū', 'spider'],
    'bug-dung': ['쇠똥구리', 'bug', 60, 'フンコロガシ', '屎壳郎|shǐkelàng', 'dung beetle'], 'bug-goldstag': ['황금 사슴벌레', 'bug', 600, 'おうごんのクワガタ', '黄金锹形虫|huángjīn qiāoxíngchóng', 'golden stag beetle'],
    'bug-rainbowbf': ['무지개 나비', 'bug', 500, 'にじいろのちょうちょ', '彩虹蝴蝶|cǎihóng húdié', 'rainbow butterfly'],
    'sea-clam': ['바지락', 'sea', 10, 'アサリ', '花蛤|huāgé', 'clam'], 'sea-mussel': ['홍합', 'sea', 10, 'ムールがい', '青口贝|qīngkǒubèi', 'mussel'],
    'sea-oyster': ['굴', 'sea', 15, 'カキ', '牡蛎|mǔlì', 'oyster'], 'sea-abalone': ['전복', 'sea', 60, 'アワビ', '鲍鱼|bàoyú', 'abalone'],
    'sea-hardclam': ['대합', 'sea', 18, 'ハマグリ', '文蛤|wéngé', 'hard clam'], 'sea-urchin': ['성게', 'sea', 40, 'ウニ', '海胆|hǎidǎn', 'sea urchin'],
    'sea-seacucumber': ['해삼', 'sea', 35, 'ナマコ', '海参|hǎishēn', 'sea cucumber'], 'sea-anemone': ['말미잘', 'sea', 25, 'イソギンチャク', '海葵|hǎikuí', 'sea anemone'],
    'sea-hermit': ['소라게', 'sea', 30, 'ヤドカリ', '寄居蟹|jìjūxiè', 'hermit crab'], 'sea-barnacle': ['거북손', 'sea', 20, 'カメノテ', '龟足|guīzú', 'gooseneck barnacle'],
    'sea-wakame': ['미역', 'sea', 6, 'わかめ', '裙带菜|qúndàicài', 'wakame'], 'sea-kelp': ['다시마', 'sea', 8, 'こんぶ', '海带|hǎidài', 'kelp'],
    'sea-nori': ['김', 'sea', 10, 'のり', '紫菜|zǐcài', 'laver'], 'sea-codium': ['청각', 'sea', 8, 'ミル', '刺松藻|cìsōngzǎo', 'green sea fingers'],
    'sea-hijiki': ['톳', 'sea', 8, 'ひじき', '羊栖菜|yángqīcài', 'hijiki'], 'sea-buoy': ['부표', 'sea', 12, 'ブイ', '浮标|fúbiāo', 'buoy'],
    'sea-anchor': ['낡은 닻', 'sea', 40, 'いかり', '锚|máo', 'anchor'], 'sea-oar': ['나무판자 조각', 'sea', 5, 'いた', '木板|mùbǎn', 'driftwood plank'],
    'sea-pirate': ['해적 동전', 'sea', 150, 'かいぞくのコイン', '海盗金币|hǎidào jīnbì', 'pirate coin'], 'sea-compass': ['낡은 나침반', 'sea', 90, 'らしんばん', '指南针|zhǐnánzhēn', 'compass'],
    'sea-pinkpearl': ['분홍 진주', 'sea', 300, 'ピンクしんじゅ', '粉珍珠|fěn zhēnzhū', 'pink pearl'], 'sea-blackpearl': ['흑진주', 'sea', 350, 'くろしんじゅ', '黑珍珠|hēi zhēnzhū', 'black pearl'],
    'sea-goldscallop': ['황금 가리비', 'sea', 400, 'おうごんのホタテ', '金扇贝|jīn shànbèi', 'golden scallop'], 'sea-mermaid': ['인어의 비늘', 'sea', 500, 'にんぎょのうろこ', '美人鱼鳞片|měirényú línpiàn', 'mermaid scale'],
    'sea-map': ['보물 지도', 'sea', 250, 'たからのちず', '藏宝图|cángbǎotú', 'treasure map'],
    'fos-trexclaw': ['티라노 발톱', 'fossil', 180, 'ティラノのつめ', '霸王龙爪|bàwánglóng zhuǎ', 'T. rex claw'], 'fos-trihorn': ['트리케라톱스 뿔', 'fossil', 200, 'トリケラトプスのつの', '三角龙角|sānjiǎolóng jiǎo', 'Triceratops horn'],
    'fos-stegoplate': ['스테고사우루스 등판', 'fossil', 200, 'ステゴサウルスのせなか', '剑龙背板|jiànlóng bèibǎn', 'Stegosaurus plate'], 'fos-pterowing': ['프테라노돈 날개', 'fossil', 220, 'プテラノドンのつばさ', '无齿翼龙翅膀|wúchǐyìlóng chìbǎng', 'Pteranodon wing'],
    'fos-brachneck': ['브라키오사우루스 목뼈', 'fossil', 230, 'ブラキオサウルスのくび', '腕龙颈骨|wànlóng jǐnggǔ', 'Brachiosaurus neck'], 'fos-egg': ['공룡 알', 'fossil', 160, 'きょうりゅうのたまご', '恐龙蛋|kǒnglóng dàn', 'dinosaur egg'],
    'fos-dung': ['공룡 똥 화석', 'fossil', 90, 'ふんのかせき', '粪化石|fèn huàshí', 'coprolite'], 'fos-raptor': ['랩터 발톱', 'fossil', 170, 'ラプトルのつめ', '迅猛龙爪|xùnměnglóng zhuǎ', 'raptor claw'],
    'fos-ankytail': ['안킬로사우루스 꼬리', 'fossil', 210, 'アンキロサウルスのしっぽ', '甲龙尾锤|jiǎlóng wěichuí', 'Ankylosaurus tail club'], 'fos-mosatooth': ['모사사우루스 이빨', 'fossil', 190, 'モササウルスのは', '沧龙牙|cānglóng yá', 'Mosasaurus tooth'],
    'fos-fern': ['고사리 화석', 'fossil', 60, 'シダのかせき', '蕨类化石|juélèi huàshí', 'fern fossil'], 'fos-fishfos': ['물고기 화석', 'fossil', 80, 'さかなのかせき', '鱼化石|yú huàshí', 'fish fossil'],
    'fos-shellfos': ['조개 화석', 'fossil', 60, 'かいのかせき', '贝壳化石|bèiké huàshí', 'shell fossil'], 'fos-dragonfos': ['잠자리 화석', 'fossil', 120, 'トンボのかせき', '蜻蜓化石|qīngtíng huàshí', 'dragonfly fossil'],
    'fos-urchinfos': ['성게 화석', 'fossil', 70, 'ウニのかせき', '海胆化石|hǎidǎn huàshí', 'sea urchin fossil'], 'fos-sabertooth': ['검치호랑이 이빨', 'fossil', 200, 'サーベルタイガーのきば', '剑齿虎牙|jiànchǐhǔ yá', 'saber-tooth fang'],
    'fos-rhinohorn': ['털코뿔소 뿔', 'fossil', 180, 'ケサイのつの', '披毛犀角|pīmáoxī jiǎo', 'woolly rhino horn'], 'fos-cavebear': ['랩터 머리뼈', 'fossil', 260, 'ラプトルのずがいこつ', '迅猛龙头骨|xùnměnglóng tóugǔ', 'raptor skull'],
    'fos-feather': ['시조새 깃털', 'fossil', 150, 'しそちょうのはね', '始祖鸟羽毛|shǐzǔniǎo yǔmáo', 'Archaeopteryx feather'], 'fos-petrified': ['규화목', 'fossil', 90, 'けいかぼく', '硅化木|guīhuàmù', 'petrified wood'],
    'fos-pottery': ['토기 조각', 'fossil', 70, 'どきのかけら', '陶片|táopiàn', 'pottery shard'], 'fos-arrowhead': ['옛날 화살촉', 'fossil', 80, 'やじり', '箭头|jiàntóu', 'arrowhead'],
    'fos-stoneaxe': ['돌도끼', 'fossil', 85, 'いしのおの', '石斧|shífǔ', 'stone axe'], 'fos-cavepaint': ['동굴 벽화 조각', 'fossil', 240, 'へきがのかけら', '岩画碎片|yánhuà suìpiàn', 'cave painting'],
    'fos-goldorn': ['금 장신구', 'fossil', 350, 'きんのかざり', '金饰|jīnshì', 'gold ornament'],
    'min-emerald': ['에메랄드', 'mineral', 220, 'エメラルド', '祖母绿|zǔmǔlǜ', 'emerald'], 'min-amethyst': ['자수정', 'mineral', 150, 'アメジスト', '紫水晶|zǐshuǐjīng', 'amethyst'],
    'min-topaz': ['토파즈', 'mineral', 180, 'トパーズ', '托帕石|tuōpàshí', 'topaz'], 'min-opal': ['오팔', 'mineral', 200, 'オパール', '欧泊|ōubó', 'opal'],
    'min-aquamarine': ['아쿠아마린', 'mineral', 180, 'アクアマリン', '海蓝宝|hǎilánbǎo', 'aquamarine'], 'min-garnet': ['가넷', 'mineral', 140, 'ガーネット', '石榴石|shíliushí', 'garnet'],
    'min-peridot': ['페리도트', 'mineral', 140, 'ペリドット', '橄榄石|gǎnlǎnshí', 'peridot'], 'min-moonstone': ['문스톤', 'mineral', 160, 'ムーンストーン', '月光石|yuèguāngshí', 'moonstone'],
    'min-turquoise': ['터키석', 'mineral', 130, 'トルコいし', '绿松石|lǜsōngshí', 'turquoise'], 'min-pinkdia': ['분홍 다이아몬드', 'mineral', 500, 'ピンクダイヤ', '粉钻|fěnzuàn', 'pink diamond'],
    'min-copper': ['구리 광석', 'mineral', 25, 'どう', '铜矿石|tóng kuàngshí', 'copper ore'], 'min-iron': ['철광석', 'mineral', 20, 'てっこうせき', '铁矿石|tiě kuàngshí', 'iron ore'],
    'min-coal': ['석탄', 'mineral', 12, 'せきたん', '煤炭|méitàn', 'coal'], 'min-quartz': ['수정', 'mineral', 60, 'すいしょう', '水晶|shuǐjīng', 'quartz'],
    'min-platinum': ['백금 광석', 'mineral', 180, 'プラチナ', '铂金|bójīn', 'platinum'], 'min-marble': ['대리석', 'mineral', 15, 'だいりせき', '大理石|dàlǐshí', 'marble'],
    'min-granite': ['화강암', 'mineral', 10, 'かこうがん', '花岗岩|huāgāngyán', 'granite'], 'min-lava': ['화산석', 'mineral', 20, 'ようがん', '熔岩|róngyán', 'lava rock'],
    'min-salt': ['소금 결정', 'mineral', 15, 'しお', '盐|yán', 'salt'], 'min-meteor': ['운석 조각', 'mineral', 300, 'いんせき', '陨石|yǔnshí', 'meteorite'],
    'min-starpiece': ['별의 조각', 'mineral', 450, 'ほしのかけら', '星星碎片|xīngxing suìpiàn', 'star fragment'], 'min-rainbowq': ['무지개 수정', 'mineral', 400, 'にじいろすいしょう', '彩虹水晶|cǎihóng shuǐjīng', 'rainbow crystal'],
    'min-dragoneye': ['용의 눈 보석', 'mineral', 550, 'りゅうのめ', '龙之眼|lóng zhī yǎn', "dragon's eye"], 'min-goldnugget': ['황금 덩어리', 'mineral', 350, 'きんかい', '金块|jīnkuài', 'gold nugget'],
    'min-mana': ['빛나는 마력석', 'mineral', 600, 'まりょくのいし', '魔力石|mólìshí', 'mana stone'],
    'for-dandelion': ['민들레', 'forest', 8, 'たんぽぽ', '蒲公英|púgōngyīng', 'dandelion'], 'for-cosmos': ['코스모스', 'forest', 10, 'コスモス', '波斯菊|bōsījú', 'cosmos'],
    'for-violet': ['제비꽃', 'forest', 10, 'すみれ', '紫罗兰|zǐluólán', 'violet'], 'for-azalea': ['진달래', 'forest', 12, 'つつじ', '杜鹃花|dùjuānhuā', 'azalea'],
    'for-forsythia': ['개나리', 'forest', 10, 'れんぎょう', '连翘|liánqiáo', 'forsythia'], 'for-mugunghwa': ['무궁화', 'forest', 20, 'むくげ', '木槿花|mùjǐnhuā', 'rose of Sharon'],
    'for-lotus': ['연꽃', 'forest', 30, 'はす', '莲花|liánhuā', 'lotus'], 'for-morningglory': ['나팔꽃', 'forest', 15, 'あさがお', '牵牛花|qiānniúhuā', 'morning glory'],
    'for-lily': ['은방울꽃', 'forest', 25, 'すずらん', '铃兰|línglán', 'lily of the valley'], 'for-babysbreath': ['안개꽃 다발', 'forest', 25, 'かすみそう', '满天星|mǎntiānxīng', "baby's breath"],
    'for-matsutake': ['송이버섯', 'forest', 120, 'まつたけ', '松茸|sōngróng', 'matsutake'], 'for-enoki': ['팽이버섯', 'forest', 12, 'えのきだけ', '金针菇|jīnzhēngū', 'enoki'],
    'for-oyster': ['느타리버섯', 'forest', 12, 'ひらたけ', '平菇|pínggū', 'oyster mushroom'], 'for-bluemush': ['빛나는 파란 버섯', 'forest', 200, 'ひかるあおいきのこ', '发光蓝蘑菇|fāguāng lán mógu', 'glowing blue mushroom'],
    'for-goldmush': ['황금 버섯', 'forest', 300, 'おうごんのきのこ', '金蘑菇|jīn mógu', 'golden mushroom'], 'for-chestnut': ['밤', 'forest', 15, 'くり', '栗子|lìzi', 'chestnut'],
    'for-raspberry': ['산딸기', 'forest', 15, 'きいちご', '树莓|shùméi', 'raspberry'], 'for-wildgrape': ['머루', 'forest', 18, 'やまぶどう', '山葡萄|shān pútao', 'wild grape'],
    'for-fiddlehead': ['고사리', 'forest', 12, 'わらび', '蕨菜|juécài', 'bracken fern'], 'for-ginseng': ['인삼', 'forest', 250, 'こうらいにんじん', '人参|rénshēn', 'ginseng'],
    'for-nest': ['새 둥지', 'forest', 40, 'とりのす', '鸟巢|niǎocháo', "bird's nest"], 'for-honeycomb': ['벌집 조각', 'forest', 60, 'はちのす', '蜂巢|fēngcháo', 'honeycomb'],
    'for-mossrock': ['이끼 낀 돌', 'forest', 15, 'こけむしたいし', '青苔石|qīngtái shí', 'mossy rock'], 'for-fireflyjar': ['반딧불이 병', 'forest', 120, 'ほたるのびん', '萤火虫瓶|yínghuǒchóng píng', 'firefly jar'],
    'for-fairywing': ['요정의 날개 조각', 'forest', 500, 'ようせいのはね', '精灵翅膀|jīnglíng chìbǎng', 'fairy wing']
  };
  Object.keys(RAW2).forEach(function (id) { var r = RAW2[id], z = r[4].split('|'); ITEMS[id] = { id: id, ko: r[0], cat: r[1], price: r[2], ja: [r[3], ''], zh: [z[0], z[1]], en: [r[5], ''], img: 'img/w/' + id + '.png' }; });
  ITEMS.recipe = { id: 'recipe', ko: '레시피 쪽지', cat: 'note', price: 0, ja: ['レシピ', ''], zh: ['食谱', 'shípǔ'], en: ['recipe', ''], img: 'img/w/it-recipe.png' };
  // 곤충이 나오는 때와 곳: m 아침, d 낮, e 저녁, n 밤 / flower 꽃·풀, tree 나무, water 물가
  var BUGS = { yellowbf: ['md', 'flower', 3], bluebf: ['d', 'flower', 2], ladybug: ['md', 'flower', 3], bee: ['md', 'flower', 2], dragonfly: ['de', 'water', 2], beetle: ['en', 'tree', 1], stag: ['n', 'tree', 1], firefly: ['n', 'water', 2], cicada: ['d', 'tree', 2], snail: ['me', 'flower', 2],
    'bug-monarch': ['d', 'flower', 2], 'bug-whitebf': ['md', 'flower', 3], 'bug-swallowtail': ['md', 'flower', 2], 'bug-peacock': ['d', 'flower', 1], 'bug-moth': ['en', 'tree', 2],
    'bug-grasshopper': ['md', 'flower', 3], 'bug-cricket': ['en', 'flower', 3], 'bug-mantis': ['de', 'flower', 2], 'bug-ricegrass': ['d', 'flower', 2], 'bug-katydid': ['den', 'flower', 2],
    'bug-longhorn': ['de', 'tree', 2], 'bug-chafer': ['md', 'tree', 2], 'bug-jewel': ['d', 'tree', 1], 'bug-higurashi': ['me', 'tree', 2], 'bug-stick': ['dn', 'tree', 1],
    'bug-strider': ['md', 'water', 3], 'bug-divingbeetle': ['en', 'water', 2], 'bug-redfly': ['de', 'water', 2], 'bug-waterbug': ['n', 'water', 1], 'bug-damselfly': ['md', 'water', 2],
    'bug-ant': ['mde', 'flower', 3], 'bug-spider': ['en', 'tree', 2], 'bug-dung': ['d', 'flower', 1], 'bug-goldstag': ['n', 'tree', 0.25], 'bug-rainbowbf': ['d', 'flower', 0.25] };
  var CATS = { fruit: '🍎 열매', forest: '🌲 숲', mineral: '🪨 광물', sea: '🐚 바다', bug: '🦋 곤충', fossil: '🦴 화석' };
  M.GATHER = { ITEMS: ITEMS, BUGS: BUGS };

  function S() {
    var g = M.P.gather = M.P.gather || { bag: {}, dex: {}, trees: {}, rocks: {}, picked: {}, day: '' };
    if (g.day !== M.today()) { g.day = M.today(); g.picked = {}; g.rocks = {}; g.wood = {}; }
    g.wood = g.wood || {};
    return g;
  }
  function slot() { var h = new Date().getHours(); return h >= 5 && h < 10 ? 'm' : h >= 10 && h < 17 ? 'd' : h >= 17 && h < 20 ? 'e' : 'n'; }
  // 행운의 향수가 켜져 있으면 귀한 것(무게가 작은 것)이 세 배 잘 나온다
  function lucky(list) { if (!M.luckOn || !M.luckOn()) return list; return list.map(function (x) { return [x[0], x[1] < 2 ? x[1] * 3 : x[1]]; }); }
  M.gatherLucky = lucky;
  function pickW(list) { var s = list.reduce(function (a, x) { return a + x[1]; }, 0), r = Math.random() * s; for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; } return list[0][0]; }
  function nm(it) { var L = M.P.lang, v = it[L] || it.en; return v; }

  // ---------- 얻기 ----------
  var popT = 0;
  M.gatherGot = function (id, n) {
    n = n || 1; var it = ITEMS[id], g = S(); if (!it) return;
    var first = !g.dex[id]; g.bag[id] = (g.bag[id] || 0) + n; g.dex[id] = (g.dex[id] || 0) + n; M.save();
    if (first && M.recipeCheck) setTimeout(M.recipeCheck, 1200);
    var host = document.querySelector('.world') || document.body, el = document.getElementById('gPop');
    if (!el) { el = document.createElement('div'); el.id = 'gPop'; el.className = 'gpop'; host.appendChild(el); }
    var v = nm(it), lang = M.P.lang;
    var ra0 = M.rarity(it.price).n;
    el.innerHTML = '<span class="gpimg' + (ra0 >= 3 ? ' rare' : '') + (it.cat === 'bug' ? ' bug' : '') + '">' + (ra0 >= 3 ? '<img class="gring" src="img/w/fx-ring.png" alt="">' : '') + (it.cat === 'bug' ? '<img class="gnet" src="img/w/fx-net.png" alt="">' : '') + '<img class="gmain" src="' + it.img + '" alt=""></span><div><b>' + it.ko + (n > 1 ? ' ×' + n : '') + (first ? ' <span class="newtag">처음!</span>' : '') + ' <small class="rs">' + M.rarity(it.price).stars + '</small></b><button class="gname lang-' + lang + '" data-gsay="' + esc(v[0]) + '">🔊 ' + esc(v[0]) + (v[1] ? ' <small>' + esc(v[1]) + '</small>' : '') + '</button></div>';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    M.say(v[0], lang); M.sfx(first ? 'win' : 'pop');
    if (ra0 >= 3 && first) M.fxPop({ bg: 'fx-burst', img: it.img, title: M.rarity(it.price).stars + ' ' + it.ko + '!', sub: '귀한 것을 처음 찾았어요', ms: 2000 });
    clearTimeout(popT); popT = setTimeout(function () { el.classList.remove('show'); }, 2600);
    if (M.quest) M.quest('gather', 1);
  };
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-gsay]'); if (b) M.say(b.dataset.gsay, M.P.lang); });

  // 열매 나무: 열매는 6시간마다 다시 열린다
  M.fruitReady = function (key) { var t = S().trees[key]; return !t || Date.now() - t >= 6 * H; };
  M.fruitLeft = function (key) { var t = S().trees[key]; return t ? Math.max(0, 6 * H - (Date.now() - t)) : 0; };
  M.shakeFruitTree = function (key, kind) {
    var g = S();
    if (M.fruitReady(key)) { g.trees[key] = Date.now(); M.save(); M.gatherGot(kind, 3); return true; }
    if (!g.wood[key]) { g.wood[key] = 1; M.save(); if (Math.random() < 0.5) { M.gatherGot(Math.random() < 0.7 ? 'branch' : 'leaf'); return true; } }
    var m = Math.ceil(M.fruitLeft(key) / 60000); M.toast('열매가 다시 열리려면 ' + (m >= 60 ? Math.floor(m / 60) + '시간 ' : '') + (m % 60) + '분 남았어요');
    return false;
  };
  // 일반 나무: 하루 한 번 흔들면 나뭇가지·통나무·도토리 등
  M.shakeTree = function (key, pine) {
    var g = S(); if (g.wood[key]) { M.toast('오늘은 이 나무에서 다 주웠어요. 내일 또 와요!'); return false; }
    g.wood[key] = 1; M.save();
    var id = pickW(lucky([['branch', 45], ['log', 18], [pine ? 'pinecone' : 'acorn', 20], ['leaf', 12], ['nothing', 15], ['for-nest', 4], ['for-honeycomb', 3], [pine ? 'for-matsutake' : 'for-chestnut', pine ? 1.5 : 6]]));
    if (id === 'nothing') { M.toast('나뭇잎만 살랑살랑… 아무것도 안 떨어졌어요'); return true; }
    M.gatherGot(id, id === 'branch' ? 2 : 1); return true;
  };
  // 바위: 하루 3번
  M.hitRock = function (key) {
    var g = S(), n = g.rocks[key] || 0;
    if (n >= 3) { M.toast('이 바위는 오늘 더 캘 게 없어요. 내일 또 와요!'); return false; }
    g.rocks[key] = n + 1; M.save();
    M.gatherGot(pickW(lucky([['stone', 40], ['clay', 18], ['pebble', 14], ['gold', 4], ['gem', 2], ['min-copper', 10], ['min-iron', 10], ['min-coal', 10], ['min-granite', 8], ['min-marble', 6], ['min-salt', 4], ['min-quartz', 4], ['min-lava', 3],
      ['min-amethyst', 0.8], ['min-garnet', 0.8], ['min-peridot', 0.8], ['min-turquoise', 0.8], ['min-moonstone', 0.6], ['min-platinum', 0.6], ['min-meteor', 0.2]])));
    return true;
  };
  // 오늘 마을에 놓일 물건들 (매일 바뀐다)
  // 행운의 향수: 30분 동안 곤충이 두 배로 자주 나오고, 바닥 물건이 한 번 더 생긴다
  var LUCK_MS = 30 * 60000, LUCK_PRICE = 80;
  M.luckLeft = function () { var g = S(); return Math.max(0, (g.luckAt || 0) + LUCK_MS - Date.now()); };
  M.luckOn = function () { return M.luckLeft() > 0; };
  M.luckBuy = function () {
    if (!M.spend('coins', LUCK_PRICE)) { M.toast('코인이 모자라요'); return false; }
    var g = S(); g.luckAt = Date.now(); g.luckSeed = Date.now() % 100000 + 1; M.save(); M.sfx('win');
    M.toast('✨ 행운의 향수! 30분 동안 곤충과 물건이 두 배로 나와요'); return true;
  };
  M.gatherDaily = function (cands, extra) {
    var g = S(), seed = (extra || parseInt(M.today().replace(/\D/g, ''), 10)) % 2147483646 + 1, rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var out = [], boost = function (t) { return extra ? t.map(function (x) { return [x[0], x[1] < 2 ? x[1] * 3 : x[1]]; }) : t; };
    function place(list, n, type, table) {
      var used = {};
      for (var i = 0; i < n && list.length; i++) {
        var k = Math.floor(rnd() * list.length), c = list[k], key = (extra ? 'L' + extra : '') + type + c[0] + ',' + c[1]; if (used[key]) continue; used[key] = 1;
        var s = table.reduce(function (a, x) { return a + x[1]; }, 0), r = rnd() * s, id = table[0][0];
        for (var j = 0; j < table.length; j++) { r -= table[j][1]; if (r <= 0) { id = table[j][0]; break; } }
        if (!g.picked[key]) out.push({ key: key, type: type, id: id, x: c[0], y: c[1] });
      }
    }
    place(cands.grass, 4, 'f', boost([['mush-red', 8], ['mush-brown', 9], ['mush-white', 9], ['flowers', 10], ['acorn', 8], ['pinecone', 6], ['leaf', 7], ['clover', 3], ['for-dandelion', 7], ['for-cosmos', 6], ['for-violet', 6], ['for-azalea', 5], ['for-forsythia', 5], ['for-mugunghwa', 4], ['for-lotus', 2], ['for-morningglory', 4], ['for-lily', 3], ['for-babysbreath', 3], ['for-enoki', 6], ['for-oyster', 6], ['for-matsutake', 1.5], ['for-bluemush', 0.6], ['for-goldmush', 0.4], ['for-raspberry', 5], ['for-wildgrape', 4], ['for-fiddlehead', 5], ['for-ginseng', 0.6], ['for-mossrock', 4], ['for-fireflyjar', 1], ['for-fairywing', 0.3]]));
    place(cands.sand, 4, 's', boost([['scallop', 14], ['conch', 10], ['sanddollar', 10], ['seaweed', 8], ['starfish', 7], ['glass', 6], ['coral', 4], ['crab', 4], ['bottle', 2], ['pearl', 1], ['sea-clam', 10], ['sea-mussel', 8], ['sea-oyster', 6], ['sea-hardclam', 6], ['sea-abalone', 2], ['sea-urchin', 3], ['sea-seacucumber', 3], ['sea-anemone', 3], ['sea-hermit', 4], ['sea-barnacle', 3], ['sea-wakame', 7], ['sea-kelp', 6], ['sea-nori', 4], ['sea-codium', 4], ['sea-hijiki', 4], ['sea-buoy', 3], ['sea-oar', 4], ['sea-anchor', 1.5], ['sea-compass', 1], ['sea-pirate', 0.7], ['sea-map', 0.5], ['sea-pinkpearl', 0.4], ['sea-blackpearl', 0.3], ['sea-goldscallop', 0.3], ['sea-mermaid', 0.2]]));
    place(cands.grass, 2, 'd', [['dig', 1]]);
    if (rnd() < 0.6) place(cands.grass, 1, 'r', [['recipe', 1]]);   // 레시피 쪽지 (이틀에 한 번 남짓)
    return out;
  };
  M.gatherPick = function (o) {
    var g = S(); g.picked[o.key] = 1; M.save();
    if (o.type === 'r') { var rid = M.recipeLearnRandom && M.recipeLearnRandom('풀밭에서 쪽지를 주웠어요'); if (!rid) M.toast('📜 쪽지에는 이미 아는 레시피가 적혀 있었어요'); M.sfx('win'); return; }
    if (o.type === 'd' && Math.random() < 0.08 && M.recipeLearnRandom && M.recipeLearnRandom('땅속에서 낡은 요리책 쪽지가 나왔어요')) return;
    if (o.type === 'd') M.gatherGot(pickW(lucky([['bone', 10], ['ammonite', 9], ['footprint', 8], ['trilobite', 8], ['tooth', 6], ['leaffos', 9], ['amber', 5], ['coin', 5], ['stone', 22], ['clay', 14],
      ['fos-fern', 7], ['fos-shellfos', 7], ['fos-urchinfos', 5], ['fos-fishfos', 5], ['fos-dung', 5], ['fos-pottery', 5], ['fos-arrowhead', 4], ['fos-stoneaxe', 4], ['fos-petrified', 4], ['fos-dragonfos', 2],
      ['fos-egg', 2], ['fos-raptor', 1.5], ['fos-trexclaw', 1.2], ['fos-mosatooth', 1.2], ['fos-rhinohorn', 1.2], ['fos-sabertooth', 1], ['fos-feather', 1], ['fos-trihorn', 0.8], ['fos-stegoplate', 0.8], ['fos-ankytail', 0.8],
      ['fos-pterowing', 0.6], ['fos-brachneck', 0.6], ['fos-cavebear', 0.5], ['fos-cavepaint', 0.5], ['fos-goldorn', 0.4]])));
    else M.gatherGot(o.id);
  };
  // 곤충: 지금 시간대에 나올 수 있는 것
  M.bugNow = function (where) {
    var t = slot(), list = Object.keys(BUGS).filter(function (k) { return BUGS[k][0].indexOf(t) >= 0 && BUGS[k][1] === where; }).map(function (k) { return [k, BUGS[k][2]]; });
    return list.length ? pickW(lucky(list)) : null;
  };

  // ---------- 가방 ----------
  M.gatherBag = function () {
    var g = S(), tab = 'all';
    var d = M.modal('<h3>🧺 가방</h3><div id="gbLuck"></div><div class="fcats" id="gbCats"></div><div class="gbag" id="gbList"></div><p class="hint">누르면 팔 수 있어요. 나뭇가지·통나무·돌·점토·금광석은 집 넓히기 재료예요.</p><button class="btn ghost wide" data-close>닫기</button>', { cls: 'bagsheet' });
    function paint() {
      var ll = M.luckLeft();
      d.querySelector('#gbLuck').innerHTML = ll ? '<p class="luckon">✨ 행운의 향수 남은 시간 ' + Math.ceil(ll / 60000) + '분</p>' : '<button class="btn wide" data-luck><img class="inl" src="img/w/it-perfume.png" alt=""> 행운의 향수 <small>30분 동안 곤충·물건 두 배</small> <img class="inl" src="img/coin.png" alt="">' + LUCK_PRICE + '</button>';
      d.querySelector('#gbCats').innerHTML = '<button data-gc="all" class="' + (tab === 'all' ? 'on' : '') + '">전체</button>' + Object.keys(CATS).concat(['fish', 'bait']).map(function (c) { return '<button data-gc="' + c + '" class="' + (tab === c ? 'on' : '') + '">' + (CATS[c] || (c === 'fish' ? '🐟 물고기' : '🪱 미끼')) + '</button>'; }).join('');
      if (tab === 'fish' || tab === 'bait') {
        var fb = M.P.fishBag || {}, bt = M.P.bait || {};
        d.querySelector('#gbList').innerHTML = tab === 'fish' ? ((M.FISH || []).filter(function (f) { return fb[f.id] > 0; }).map(function (f) { var ra = M.rarity(f.price, f.r); return '<button class="gbi r' + ra.n + '" data-gf="' + f.id + '"><img src="img/w/fish-' + f.id + '.png" alt=""><b>' + f.ko + '</b><small class="rs">' + ra.stars + '</small><i>' + fb[f.id] + '</i></button>'; }).join('') || '<p class="hint center">낚시로 잡고 "가방에 넣기"를 누르면 여기 모여요</p>')
          : Object.keys(M.BAITS || {}).filter(function (k) { return k !== 'fish'; }).map(function (k) { var B = M.BAITS[k]; return '<div class="gbi">' + M.baitIcon(k, '') + '<b>' + B.name + '</b><i>' + (bt[k] || 0) + '</i></div>'; }).join('') + '<button class="btn wide" data-gbait style="grid-column:1/-1"><img class="inl" src="img/w/it-wormbox.png" alt=""> 미끼 사기</button>';
        return;
      }
      var ks = Object.keys(g.bag).filter(function (k) { return g.bag[k] > 0 && ITEMS[k] && (tab === 'all' || ITEMS[k].cat === tab); });
      var arena = tab === 'bug' && M.bugArena ? '<button class="btn primary wide" data-arena style="grid-column:1/-1">🪲 곤충 배틀장 가기</button>' : '';
      d.querySelector('#gbList').innerHTML = ks.length ? ks.map(function (k) { var it = ITEMS[k]; var ra = M.rarity(it.price); return '<button class="gbi r' + ra.n + '" data-gi="' + k + '"><img src="' + it.img + '" alt=""><b>' + it.ko + '</b><small class="rs">' + ra.stars + '</small><i>' + g.bag[k] + '</i></button>'; }).join('') + arena : arena + '<p class="hint center">아직 비어 있어요. 마을에서 나무를 흔들거나 바닥을 살펴보세요!</p>';
    }
    paint();
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-luck]')) { if (M.luckBuy()) paint(); return; }
      var c = e.target.closest('[data-gc]'); if (c) { tab = c.dataset.gc; paint(); return; }
      if (e.target.closest('[data-gbait]')) { M.baitSheet(null, paint); return; }
      if (e.target.closest('[data-arena]')) { d.close(); M.bugArena(); return; }
      var fbn = e.target.closest('[data-gf]');
      if (fbn) { var f = (M.FISH || []).filter(function (x) { return x.id === fbn.dataset.gf; })[0], cnt = M.P.fishBag[f.id];
        var fs = M.modal('<div class="center"><img class="gbig" src="img/w/fish-' + f.id + '.png" alt=""><h3>' + f.ko + '</h3><p>' + cnt + '마리 · 하나에 <img class="inl" src="img/coin.png" alt="">' + f.price + '</p><p class="hint">요리 재료나 낚시 미끼로도 써요</p></div><div class="row2"><button class="btn" data-s1>1마리 팔기</button><button class="btn primary" data-sa>모두 팔기</button></div><button class="btn ghost wide" data-close>닫기</button>');
        fs.addEventListener('click', function (e2) { var m = e2.target.closest('[data-s1]') ? 1 : e2.target.closest('[data-sa]') ? M.P.fishBag[f.id] : 0; if (!m) return; M.P.fishBag[f.id] -= m; M.give({ coins: f.price * m }); M.sfx('coin'); M.save(); fs.close(); paint(); });
        return; }
      var b = e.target.closest('[data-gi]'); if (!b) return;
      var it = ITEMS[b.dataset.gi], v = nm(it), n = g.bag[it.id];
      var s = M.modal('<div class="center"><img class="gbig" src="' + it.img + '" alt=""><h3>' + it.ko + '</h3><button class="gname lang-' + M.P.lang + '" data-gsay="' + esc(v[0]) + '">🔊 ' + esc(v[0]) + (v[1] ? ' <small>' + esc(v[1]) + '</small>' : '') + '</button><p>' + n + '개 · 하나에 <img class="inl" src="img/coin.png" alt="">' + it.price + '</p></div><div class="row2"><button class="btn" data-s1>1개 팔기</button><button class="btn primary" data-sa>모두 팔기</button></div><button class="btn ghost wide" data-close>닫기</button>');
      s.addEventListener('click', function (e2) {
        var m = e2.target.closest('[data-s1]') ? 1 : e2.target.closest('[data-sa]') ? g.bag[it.id] : 0; if (!m) return;
        g.bag[it.id] -= m; M.give({ coins: it.price * m }); M.sfx('coin'); M.save(); s.close(); paint();
      });
    });
  };
  // ---------- 박물관 도감 ----------
  M.gatherDex = function (cat) {
    var cs = cat === 'forest' ? ['fruit', 'forest'] : [cat], title = cat === 'forest' ? '🌲 꽃·숲·열매' : cat === 'mineral' ? '💎 광물·보석' : CATS[cat];
    var g = S(), lang = M.P.lang, ks = Object.keys(ITEMS).filter(function (k) { return cs.indexOf(ITEMS[k].cat) >= 0; }), n = ks.filter(function (k) { return g.dex[k]; }).length;
    var tn = { m: '아침', d: '낮', e: '저녁', n: '밤' }, wn = { flower: '꽃·풀밭', tree: '나무', water: '물가' };
    M.modal('<h3>' + title + ' 도감 <small>' + n + ' / ' + ks.length + '</small></h3>' + (cat === 'bug' ? '<p class="hint">시간대마다 나오는 곤충이 달라요</p>' : '') + '<div class="fdex">' + ks.map(function (k) {
      var it = ITEMS[k], got = g.dex[k], v = nm(it), b = BUGS[k];
      return '<div class="fd' + (got ? '' : ' unk') + '"' + (got ? ' data-card="' + k + '"' : '') + '><span class="fde"><img src="' + it.img + '" alt=""></span><b>' + (got ? it.ko : '???') + '</b>' + (got ? '<small class="lang-' + lang + '">' + esc(v[0]) + '</small>' : '') + (b ? '<small>' + wn[b[1]] + ' · ' + b[0].split('').map(function (x) { return tn[x]; }).join('·') + '</small>' : '') + '</div>';
    }).join('') + '</div><p class="hint center">찾은 것을 누르면 세 나라 말로 들을 수 있어요</p><button class="btn primary wide" data-close>닫기</button>');
  };
  // 도감 카드: 누르면 크게 보이고 일본어·영어·중국어로 들을 수 있다
  M.dexCard = function (img, ko, names, extra) {
    var L = [['ja', '日本語'], ['en', 'English'], ['zh', '中文']];
    var d = M.modal('<div class="dexcard"><img src="' + img + '" alt=""><h3>' + esc(ko) + '</h3>' + (extra ? '<p class="hint">' + extra + '</p>' : '') +
      '<div class="dnames">' + L.map(function (l) { var v = names[l[0]] || ['']; return '<div class="dn"><span class="dlang lang-' + l[0] + '"><b>' + esc(v[0]) + '</b>' + (v[1] ? '<small>' + esc(v[1]) + '</small>' : '') + '</span><button class="dsay" data-dl="' + l[0] + '" data-dt="' + esc(v[0]) + '">🔊 ' + l[1] + '</button></div>'; }).join('') + '</div></div><button class="btn ghost wide" data-close>닫기</button>');
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-dl]'); if (b) M.say(b.dataset.dt, b.dataset.dl); });
    M.say((names[M.P.lang] || names.en)[0], M.P.lang);
  };
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-card]'); if (!c) return;
    var it = ITEMS[c.dataset.card]; if (it) { var ra = M.rarity(it.price); M.dexCard(it.img, it.ko, { ja: it.ja, en: it.en, zh: it.zh }, ra.stars + ' ' + ra.name); }
  });

  // ---------- 집 넓히기 ----------
  var HOUSE = [null,
    { name: '작은 집', pots: 3, floors: 1, need: {} },
    { name: '2층 집', pots: 4, floors: 2, coins: 300, need: { branch: 10, stone: 5 } },
    { name: '3층 집', pots: 5, floors: 3, coins: 800, need: { log: 6, stone: 10, clay: 6 } },
    { name: '옥상 정원이 있는 큰 집', pots: 6, floors: 4, coins: 2000, need: { log: 12, clay: 10, gold: 2, branch: 15 } }];
  M.houseLv = function () { return (M.P.house && M.P.house.lv) || 1; };
  M.houseInfo = function () { return HOUSE[M.houseLv()]; };
  M.houseSheet = function () {
    var lv = M.houseLv(), nx = HOUSE[lv + 1], g = S();
    if (!nx) { M.modal('<div class="center"><div class="tbig">🏡</div><h3>' + HOUSE[lv].name + '</h3><p>집을 끝까지 넓혔어요!</p><button class="btn primary wide" data-close>좋아요</button></div>'); return; }
    var ok = Object.keys(nx.need).every(function (k) { return (g.bag[k] || 0) >= nx.need[k]; }) && M.P.coins >= nx.coins;
    var d = M.modal('<h3>🔨 집 넓히기</h3><p>' + HOUSE[lv].name + ' → <b>' + nx.name + '</b> · 화분 자리 ' + nx.pots + '칸까지</p><div class="hneed">' +
      Object.keys(nx.need).map(function (k) { var have = g.bag[k] || 0, it = ITEMS[k]; return '<div class="hn' + (have >= nx.need[k] ? ' ok' : '') + '"><img src="' + it.img + '" alt=""><b>' + it.ko + '</b><small>' + have + ' / ' + nx.need[k] + '</small></div>'; }).join('') +
      '<div class="hn' + (M.P.coins >= nx.coins ? ' ok' : '') + '"><img src="img/coin.png" alt=""><b>코인</b><small>' + M.P.coins + ' / ' + nx.coins + '</small></div></div>' +
      '<p class="hint">재료는 마을에서 나무를 흔들고 바위를 두드려 모아요</p><button class="btn primary wide" data-hup' + (ok ? '' : ' disabled') + '>넓히기</button><button class="btn ghost wide" data-close>닫기</button>');
    d.querySelector('[data-hup]').onclick = function () {
      if (!M.spend('coins', nx.coins)) return;
      Object.keys(nx.need).forEach(function (k) { g.bag[k] -= nx.need[k]; });
      M.P.house = M.P.house || {}; M.P.house.lv = lv + 1; M.save(); d.close(); M.sfx('win');
      M.modal('<div class="center"><div class="tbig">🏡✨</div><h3>' + nx.name + '이 됐어요!</h3><p>' + (nx.floors > 1 ? '토끼 집 위쪽의 층 단추로 <b>' + nx.floors + '층</b>까지 오가며 꾸밀 수 있어요. ' : '') + '화분을 ' + nx.pots + '개까지 놓을 수 있어요.</p><button class="btn primary wide" data-close>좋아요</button></div>', { onClose: function () { if (M.render) M.render(); } });
    };
  };
})();
