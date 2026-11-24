// 영어 초급 단어 (말씨정원). 생활 필수 단어를 주제별로 골라 직접 만들었다.
(function () {
  var U = window.LANGS.en.units;
  function S(title, items, sent) { return { title: title, items: items.trim(), sents: sent }; }
  U.push({ title: '초급 · 숫자와 시간', level: 'A1', stages: [
    S('숫자 11 ~ 20', `
eleven|일레븐|11|
twelve|트웰브|12|
thirteen|써틴|13|
fifteen|피프틴|15|
twenty|트웬티|20|
hundred|헌드레드|100|`, `I/am/twenty=스무 살/years=해(년)/old=나이 든|저는 스무 살이에요`),
    S('요일', `
Monday|먼데이|월요일|
Tuesday|튜즈데이|화요일|
Wednesday|웬즈데이|수요일|
Thursday|써즈데이|목요일|
Friday|프라이데이|금요일|
weekend|위켄드|주말|`, `see/you=너/on=~에/Monday=월요일|월요일에 봐요`),
    S('하루의 때', `
today|투데이|오늘|📅
tomorrow|투마로|내일|➡️
yesterday|예스터데이|어제|⬅️
morning|모닝|아침|🌅
afternoon|애프터눈|오후|🌤️
evening|이브닝|저녁|🌆`, `see/you=너/tomorrow=내일/morning=아침|내일 아침에 봐요`),
    S('시간 말하기', `
time|타임|시간|⏰
hour|아워|한 시간|🕐
minute|미닛|분|⏱️
o'clock|어클락|~시 정각|🕒
now|나우|지금|👉
late|레이트|늦은|🐢`, `what=무엇/time=시간/is=~이다/it=그것|지금 몇 시예요?`),
    S('계절과 달', `
spring|스프링|봄|🌸
summer|써머|여름|☀️
fall|폴|가을|🍂
winter|윈터|겨울|⛄
month|먼쓰|달 (월)|🗓️
year|이어|해 (년)|🎆`, `I/like=좋아하다/spring=봄|저는 봄을 좋아해요`)
  ] });
  U.push({ title: '초급 · 사람과 몸', level: 'A1', stages: [
    S('사람', `
man|맨|남자|👨
woman|우먼|여자|👩
boy|보이|남자아이|👦
girl|걸|여자아이|👧
baby|베이비|아기|👶
friend|프렌드|친구|🧑‍🤝‍🧑`, `she/is=~이다/my/friend=친구|그녀는 제 친구예요`),
    S('가족 2', `
brother|브라더|형제 (형·오빠·남동생)|👦
sister|시스터|자매 (언니·누나·여동생)|👧
son|썬|아들|👦
daughter|도터|딸|👧
grandma|그랜마|할머니|👵
grandpa|그랜파|할아버지|👴`, `my/sister=여동생/is=~이다/cute=귀여운|제 여동생은 귀여워요`),
    S('직업', `
teacher|티처|선생님|🧑‍🏫
doctor|닥터|의사|🧑‍⚕️
nurse|너스|간호사|👩‍⚕️
student|스튜던트|학생|🧑‍🎓
chef|셰프|요리사|👩‍🍳
driver|드라이버|운전사|🚕`, `I/am/a=하나의/student=학생|저는 학생이에요`),
    S('얼굴', `
face|페이스|얼굴|🙂
eye|아이|눈 (얼굴)|👁️
ear|이어|귀|👂
nose|노즈|코|👃
mouth|마우쓰|입|👄
hair|헤어|머리카락|💇`, `she/has=가지다/long=긴/hair=머리카락|그녀는 머리가 길어요`),
    S('몸', `
head|헤드|머리|🗣️
hand|핸드|손|✋
arm|암|팔|💪
leg|레그|다리|🦵
foot|풋|발|🦶
back|백|등|🔙`, `my/head=머리/hurts=아프다|머리가 아파요`)
  ] });
  U.push({ title: '초급 · 옷과 물건', level: 'A1', stages: [
    S('옷', `
shirt|셔트|셔츠|👕
pants|팬츠|바지|👖
dress|드레스|원피스|👗
skirt|스커트|치마|👗
coat|코트|코트|🧥
shoes|슈즈|신발|👟`, `I/like/your=너의/dress=원피스|원피스가 예뻐요`),
    S('소품', `
hat|햇|모자|👒
bag|백|가방|👜
glasses|글래시즈|안경|👓
watch|워치|손목시계|⌚
umbrella|엄브렐라|우산|☂️
ring|링|반지|💍`, `where=어디/is=~이다/my/bag=가방|제 가방 어디 있어요?`),
    S('집 안 물건', `
table|테이블|탁자|🪑
chair|체어|의자|🪑
door|도어|문|🚪
lamp|램프|전등|💡
clock|클락|시계|🕰️
mirror|미러|거울|🪞`, `open/the=그/door=문|문을 열어 주세요`),
    S('생활 물건', `
phone|폰|전화기|📱
key|키|열쇠|🔑
money|머니|돈|💵
book|북|책|📖
pen|펜|펜|🖊️
box|박스|상자|📦`, `I/lost=잃어버렸다/my/key=열쇠|열쇠를 잃어버렸어요`),
    S('부엌 물건', `
cup|컵|컵|🥤
plate|플레이트|접시|🍽️
spoon|스푼|숟가락|🥄
knife|나이프|칼|🔪
bowl|보울|그릇|🥣
bottle|바틀|병|🍼`, `a=하나의/cup/of=~의/tea=차|차 한 잔`)
  ] });
  U.push({ title: '초급 · 음식', level: 'A1', stages: [
    S('과일', `
banana|바나나|바나나|🍌
orange|오렌지|오렌지|🍊
grape|그레이프|포도|🍇
strawberry|스트로베리|딸기|🍓
peach|피치|복숭아|🍑
lemon|레몬|레몬|🍋`, `I/love=아주 좋아하다/strawberries=딸기|저는 딸기를 정말 좋아해요`),
    S('채소', `
potato|포테이토|감자|🥔
tomato|토메이토|토마토|🍅
carrot|캐럿|당근|🥕
onion|어니언|양파|🧅
corn|콘|옥수수|🌽
mushroom|머쉬룸|버섯|🍄`, `rabbits=토끼들/like=좋아하다/carrots=당근|토끼는 당근을 좋아해요`),
    S('식사', `
breakfast|브렉퍼스트|아침밥|🍳
lunch|런치|점심밥|🍱
dinner|디너|저녁밥|🍽️
soup|수프|수프·국|🍲
noodles|누들즈|국수|🍜
sandwich|샌드위치|샌드위치|🥪`, `let's=~하자/have=먹다/lunch=점심|점심 먹자`),
    S('맛과 양념', `
sweet|스위트|달콤한|🍬
salty|솔티|짠|🧂
spicy|스파이시|매운|🌶️
sour|사워|신|🍋
sugar|슈거|설탕|🍚
salt|솔트|소금|🧂`, `this/soup=수프/is=~이다/salty=짠|이 수프는 짜요`),
    S('간식', `
cookie|쿠키|쿠키|🍪
ice cream|아이스크림|아이스크림|🍦
chocolate|초콜릿|초콜릿|🍫
candy|캔디|사탕|🍬
popcorn|팝콘|팝콘|🍿
donut|도넛|도넛|🍩`, `I/want=원하다/ice cream=아이스크림|아이스크림 먹고 싶어요`)
  ] });
  U.push({ title: '초급 · 동물과 자연', level: 'A1', stages: [
    S('동물', `
bird|버드|새|🐦
fish|피쉬|물고기|🐟
horse|호스|말|🐴
cow|카우|소|🐄
pig|피그|돼지|🐷
bear|베어|곰|🐻`, `the=그/bird=새/is=~이다/singing=노래하는 중|새가 노래하고 있어요`),
    S('동물 2', `
mouse|마우스|쥐|🐭
duck|덕|오리|🦆
monkey|멍키|원숭이|🐵
lion|라이언|사자|🦁
elephant|엘리펀트|코끼리|🐘
panda|팬더|판다|🐼`, `the=그/elephant=코끼리/is=~이다/big=큰|코끼리는 커요`),
    S('날씨', `
sunny|써니|화창한|☀️
rainy|레이니|비 오는|🌧️
cloudy|클라우디|흐린|☁️
snowy|스노위|눈 오는|❄️
windy|윈디|바람 부는|🌬️
weather|웨더|날씨|🌈`, `it's=날씨가 ~이다/sunny=화창한/today=오늘|오늘은 화창해요`),
    S('자연', `
sun|썬|해|🌞
moon|문|달|🌙
star|스타|별|⭐
sky|스카이|하늘|🌌
sea|씨|바다|🌊
mountain|마운틴|산|⛰️`, `look=봐/at=~을/the=그/moon=달|달 좀 봐요`),
    S('자연 2', `
river|리버|강|🏞️
rain|레인|비|🌧️
snow|스노|눈 (날씨)|❄️
wind|윈드|바람|🌬️
grass|그래스|풀|🌿
leaf|리프|잎|🍃`, `I/like/snow=눈|저는 눈을 좋아해요`)
  ] });
  U.push({ title: '초급 · 장소와 교통', level: 'A1', stages: [
    S('동네 장소', `
park|파크|공원|🏞️
bank|뱅크|은행|🏦
library|라이브러리|도서관|📚
church|처치|교회|⛪
bakery|베이커리|빵집|🥐
cafe|카페|카페|☕`, `let's=~하자/go/to=~에/the=그/park=공원|공원에 가자`),
    S('더 많은 장소', `
market|마켓|시장|🛒
hotel|호텔|호텔|🏨
airport|에어포트|공항|🛫
office|오피스|사무실|🏢
beach|비치|해변|🏖️
city|시티|도시|🏙️`, `the=그/hotel=호텔/is=~이다/near=가까운|호텔은 가까워요`),
    S('교통', `
car|카|자동차|🚗
bus|버스|버스|🚌
train|트레인|기차|🚆
taxi|택시|택시|🚕
plane|플레인|비행기|✈️
bike|바이크|자전거|🚲`, `I/go/to=~에/work=직장/by=~으로/bus=버스|저는 버스로 출근해요`),
    S('길 찾기', `
left|레프트|왼쪽|⬅️
straight|스트레이트|똑바로|⬆️
near|니어|가까운|📍
far|파|먼|🗺️
street|스트리트|거리|🛣️
corner|코너|모퉁이|↩️`, `turn=돌다/left=왼쪽으로/at=~에서/the=그/corner=모퉁이|모퉁이에서 왼쪽으로 도세요`),
    S('위치 말', `
in|인|~ 안에|📥
on|온|~ 위에|🔝
under|언더|~ 아래에|⬇️
next to|넥스트 투|~ 옆에|↔️
behind|비하인드|~ 뒤에|🔙
in front of|인 프런트 오브|~ 앞에|🔜`, `the=그/cat=고양이/is=~이다/under=~ 아래에/the=그/table=탁자|고양이가 탁자 아래에 있어요`)
  ] });
  U.push({ title: '초급 · 하루와 취미', level: 'A1', stages: [
    S('아침 일과', `
wake up|웨이크 업|잠에서 깨다|⏰
wash|워시|씻다|🧼
brush|브러시|(이를) 닦다|🪥
get dressed|겟 드레스트|옷을 입다|👗
leave|리브|떠나다·나가다|🚪
work|워크|일하다|💼`, `I/wake up=잠에서 깨다/at=~에/seven=7시|저는 7시에 일어나요`),
    S('저녁 일과', `
come back|컴 백|돌아오다|🏠
cook dinner|쿡 디너|저녁을 하다|🍳
watch TV|워치 티비|TV를 보다|📺
take a shower|테이크 어 샤워|샤워하다|🚿
rest|레스트|쉬다|🛋️
go to bed|고 투 베드|자러 가다|🛏️`, `I/watch TV=TV를 보다/after=~ 후에/dinner=저녁|저녁 먹고 TV를 봐요`),
    S('취미', `
music|뮤직|음악|🎵
movie|무비|영화|🎬
game|게임|게임|🎮
picture|픽처|사진·그림|🖼️
book club|북 클럽|독서 모임|📚
garden|가든|정원|🌷`, `I/like/movies=영화|저는 영화를 좋아해요`),
    S('운동', `
swim|스윔|수영하다|🏊
run|런|달리다|🏃
walk|워크|걷다|🚶
dance|댄스|춤추다|💃
play|플레이|놀다·(운동을) 하다|⚽
yoga|요가|요가|🧘`, `let's=~하자/go/for/a/walk=산책|산책하러 가자`),
    S('여가', `
read|리드|읽다|📖
write|라이트|쓰다|✍️
sing|씽|노래하다|🎤
draw|드로|그리다|🎨
shop|샵|쇼핑하다|🛍️
travel|트래블|여행하다|✈️`, `I/love/to/travel=여행하다|저는 여행하는 걸 좋아해요`)
  ] });
  U.push({ title: '초급 · 기분과 모양', level: 'A1', stages: [
    S('기분', `
happy|해피|행복한|😊
sad|새드|슬픈|😢
angry|앵그리|화난|😠
tired|타이어드|피곤한|😪
excited|익사이티드|신난|🤩
scared|스케어드|무서운|😱`, `I'm=나는 ~이다/so=아주/happy=행복한|정말 행복해요`),
    S('반대말 ①', `
big|빅|큰 (덩치)|🐘
little|리틀|작은 (귀엽게)|🐭
new|뉴|새로운|✨
old|올드|오래된·나이 든|🏚️
fast|패스트|빠른|🐇
slow|슬로|느린|🐢`, `my/car=차/is=~이다/old=오래된|제 차는 오래됐어요`),
    S('반대말 ②', `
long|롱|긴|📏
short|쇼트|짧은|✂️
easy|이지|쉬운|👌
difficult|디피컬트|어려운|🧩
cheap|칩|싼|🏷️
expensive|익스펜시브|비싼|💎`, `English=영어/is=~이다/not=~ 아닌/difficult=어려운|영어는 어렵지 않아요`),
    S('반대말 ③', `
cold|콜드|추운·차가운|🥶
warm|웜|따뜻한|🌤️
clean|클린|깨끗한|🧼
dirty|더티|더러운|🐷
busy|비지|바쁜|🏃
free|프리|한가한·무료의|🆓`, `are=~이니/you/busy=바쁜/today=오늘|오늘 바빠요?`),
    S('모양과 느낌', `
pretty|프리티|예쁜|🌸
cute|큐트|귀여운|🐰
kind|카인드|친절한|🤗
funny|퍼니|웃긴|😂
quiet|콰이엇|조용한|🤫
beautiful|뷰티풀|아름다운|🌹`, `your=너의/rabbit=토끼/is=~이다/so=정말/cute=귀여운|토끼가 정말 귀여워요`)
  ] });
  U.push({ title: '초급 · 자주 쓰는 동사', level: 'A1', stages: [
    S('동사 ①', `
come|컴|오다|👋
see|씨|보다|👀
look|룩|보다 (쳐다보다)|🔍
listen|리슨|듣다|👂
say|세이|말하다|💬
ask|애스크|묻다|❓`, `please=부디/listen=듣다/to=~을/me=나|제 말 좀 들어 주세요`),
    S('동사 ②', `
buy|바이|사다|🛒
sell|셀|팔다|🏷️
give|기브|주다|🎁
take|테이크|가져가다·잡다|🤲
bring|브링|가져오다|📦
send|센드|보내다|📮`, `can=~할 수 있다/you/give/me=나/a/hand=손 (도움)|좀 도와줄래요?`),
    S('동사 ③', `
open|오픈|열다|📖
close|클로즈|닫다|📕
start|스타트|시작하다|🏁
stop|스탑|멈추다|🛑
wait|웨이트|기다리다|⏳
help|헬프|돕다|🆘`, `please=부디/wait=기다리다/here=여기서|여기서 기다려 주세요`),
    S('동사 ④', `
know|노|알다|💡
learn|런|배우다|📚
study|스터디|공부하다|✏️
understand|언더스탠드|이해하다|🤔
remember|리멤버|기억하다|🧠
forget|퍼겟|잊다|❌`, `I/am=~이다/learning=배우는 중/English=영어|저는 영어를 배우고 있어요`),
    S('동사 ⑤', `
love|러브|사랑하다|❤️
want|원트|원하다|🙏
need|니드|필요하다|❗
have|해브|가지고 있다|🤲
make|메이크|만들다|🔨
use|유즈|쓰다·사용하다|🛠️`, `I/need=필요하다/your=너의/help=도움|당신의 도움이 필요해요`),
    S('동사 ⑥', `
sit|씻|앉다|🪑
stand|스탠드|서다|🧍
call|콜|전화하다·부르다|📞
meet|밋|만나다|🤝
live|리브|살다|🏡
feel|필|느끼다|💭`, `nice=좋은/to/meet=만나다/you|만나서 반가워요`)
  ] });
  U.push({ title: '초급 · 질문과 연결 말', level: 'A1', stages: [
    S('물음말', `
who|후|누구|🧑
where|웨어|어디|📍
when|웬|언제|⏰
why|와이|왜|❓
which|위치|어느 것|☝️
how much|하우 머치|얼마|💰`, `how much=얼마/is=~이다/this=이것|이거 얼마예요?`),
    S('얼마나 자주', `
always|올웨이즈|항상|🔁
usually|유주얼리|보통|📆
often|오픈|자주|🔂
sometimes|썸타임즈|가끔|🎲
never|네버|절대 ~않다|🚫
every day|에브리 데이|매일|📅`, `I/always=항상/drink=마시다/coffee=커피|저는 항상 커피를 마셔요`),
    S('연결 말', `
and|앤드|그리고|➕
but|벗|하지만|↔️
or|오어|또는|🔀
so|쏘|그래서|➡️
because|비코즈|왜냐하면|💡
then|덴|그러고 나서|⏭️`, `I'm=나는 ~이다/tired=피곤한/but=하지만/happy=행복한|피곤하지만 행복해요`),
    S('느낌 말', `
quite|콰이트|꽤|💯
really|리얼리|정말|❗
too|투|너무·~도|➕
also|올소|또한|🔗
maybe|메이비|아마|🤷
again|어겐|다시|🔄`, `see/you/again=다시|또 봐요`),
    S('짧은 대답', `
of course|오브 코스|물론이죠|👍
sure|슈어|그럼요|👌
no problem|노 프라블럼|문제없어요|🙆
I see|아이 씨|그렇군요|💡
me too|미 투|저도요|🙋
not yet|낫 옛|아직이요|⏳`, `are=~이니/you/ready=준비된/not yet=아직|준비됐어요? 아직이요`)
  ] });
})();
