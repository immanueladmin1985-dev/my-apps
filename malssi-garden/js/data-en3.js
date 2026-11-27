// 영어 A2 단어 (말씨정원). 초급(A1) 다음 단계의 생활 단어를 주제별로 골라 직접 만들었다.
// 줄 형식은 data-en2.js 와 같다: 낱말|한글 발음|뜻|그림 글자 / 문장: 낱말=뜻/…|한국어 뜻
(function () {
  var U = window.LANGS.en.units;
  function S(title, items, sent) { return { title: title, items: items.trim(), sents: sent }; }
  U.push({ title: 'A2 · 집과 집안일', level: 'A2', stages: [
    S('A2 집 안 곳곳', `
bedroom|베드룸|침실|🛏️
bathroom|배쓰룸|욕실|🛁
living room|리빙 룸|거실|🛋️
stairs|스테어즈|계단|🪜
floor|플로어|바닥·층|🟫
wall|월|벽|🧱`, `the/bathroom=욕실/is=~이다/upstairs=위층에|욕실은 위층에 있어요`),
    S('A2 집안일', `
laundry|론드리|빨래|🧺
dishes|디쉬즈|설거지 (그릇들)|🍽️
trash|트래쉬|쓰레기|🗑️
vacuum|배큠|청소기 (돌리다)|🧹
fold|폴드|개다·접다|👕
tidy|타이디|정돈된·치우다|✨`, `I/do=하다/the/laundry=빨래/on/Sundays=일요일마다|저는 일요일마다 빨래를 해요`),
    S('A2 가전과 물건', `
fridge|프리지|냉장고|🧊
oven|오븐|오븐|♨️
washing machine|워싱 머신|세탁기|🫧
towel|타월|수건|🧻
blanket|블랭킷|담요|🛌
pillow|필로우|베개|☁️`, `the/milk=우유/is=~이다/in/the/fridge=냉장고|우유는 냉장고에 있어요`),
    S('A2 고장과 수리', `
broken|브로큰|고장 난|💔
fix|픽스|고치다|🔧
leak|리크|새다|💧
battery|배터리|배터리|🔋
plug|플러그|플러그|🔌
replace|리플레이스|바꾸다·교체하다|🔁`, `can/you=너/fix=고치다/the/door=문|문 좀 고쳐 줄 수 있어요?`),
    S('A2 이사와 이웃', `
neighbor|네이버|이웃|🏘️
move|무브|이사하다·움직이다|📦
rent|렌트|집세·빌리다|🏠
apartment|아파트먼트|아파트|🏢
quiet street|콰이엇 스트리트|조용한 거리|🌳
downtown|다운타운|시내|🏙️`, `we/moved=이사했다/to/a/new=새로운/apartment=아파트|우리는 새 아파트로 이사했어요`)
  ] });
  U.push({ title: 'A2 · 장보기와 돈', level: 'A2', stages: [
    S('A2 가게에서', `
customer|커스터머|손님|🧍
cashier|캐셔|계산원|🧾
receipt|리시트|영수증|🧾
discount|디스카운트|할인|🏷️
sale|세일|할인 판매|💸
price|프라이스|가격|💲`, `is=~이다/this/on/sale=할인 중|이거 할인 중이에요?`),
    S('A2 돈', `
cash|캐쉬|현금|💵
credit card|크레딧 카드|신용카드|💳
change|체인지|거스름돈|🪙
coin|코인|동전|🪙
pay|페이|내다·지불하다|🤝
cost|코스트|(값이) 들다|💰`, `can/I/pay=내다/by/card=카드|카드로 내도 돼요?`),
    S('A2 크기와 양', `
size|사이즈|크기|📏
medium|미디엄|중간|🟠
extra|엑스트라|추가의|➕
half|해프|반|🌗
pair|페어|한 쌍·켤레|🧦
dozen|더즌|12개 (한 다스)|🥚`, `I/need=필요하다/a/pair=한 켤레/of/socks=양말|양말 한 켤레가 필요해요`),
    S('A2 바꾸고 돌려받기', `
return|리턴|돌려주다·반품하다|↩️
exchange|익스체인지|교환하다|🔄
refund|리펀드|환불|💸
wrong|롱|틀린·잘못된|❌
fit|핏|(몸에) 맞다|👗
try on|트라이 온|입어 보다|🪞`, `can/I/try=해 보다/this/on=입어|이거 입어 봐도 돼요?`),
    S('A2 시장 음식', `
vegetable|베지터블|채소|🥬
fruit|프루트|과일|🍎
meat|미트|고기|🥩
seafood|씨푸드|해산물|🦐
fresh|프레쉬|신선한|🌿
bag of|백 오브|~ 한 봉지|🛍️`, `the/fish=생선/is=~이다/very/fresh=신선한|생선이 아주 신선해요`)
  ] });
  U.push({ title: 'A2 · 식당과 요리', level: 'A2', stages: [
    S('A2 식당에서', `
waiter|웨이터|종업원|🤵
order|오더|주문 (하다)|📝
reservation|레저베이션|예약|📅
table for two|테이블 포 투|두 명 자리|🍽️
dessert|디저트|후식|🍮
tip|팁|팁|💵`, `I/have=가지다/a/reservation=예약|예약했어요`),
    S('A2 맛', `
bitter|비터|쓴|☕
bland|블랜드|싱거운|🥣
tasty|테이스티|맛있는|😋
smell|스멜|냄새 (나다)|👃
taste|테이스트|맛 (보다)|👅
crispy|크리스피|바삭한|🍟`, `this/soup=수프/tastes=맛이 나다/bland=싱거운|이 수프는 싱거워요`),
    S('A2 요리하기', `
boil|보일|끓이다|🫕
bake|베이크|굽다 (오븐)|🧁
cut|컷|자르다|🔪
mix|믹스|섞다|🥣
pour|포어|붓다|🫗
recipe|레서피|요리법|📖`, `mix=섞다/the/eggs=달걀/and/sugar=설탕|달걀과 설탕을 섞으세요`),
    S('A2 재료', `
butter|버터|버터|🧈
flour|플라워|밀가루|🌾
oil|오일|기름|🫒
pepper|페퍼|후추·고추|🌶️
garlic|갈릭|마늘|🧄
cheese|치즈|치즈|🧀`, `add=넣다/some/garlic=마늘|마늘을 좀 넣어요`),
    S('A2 식사 때', `
snack|스낵|간식|🍪
meal|밀|식사|🍱
share|쉐어|나누다|🤲
full of|풀 오브|~로 가득한|🫙
leftovers|레프트오버즈|남은 음식|🥡
takeout|테이크아웃|포장 음식|🛍️`, `let's/share=나누다/a/pizza=피자|피자 하나 나눠 먹어요`)
  ] });
  U.push({ title: 'A2 · 건강과 병원', level: 'A2', stages: [
    S('A2 아픈 곳', `
headache|헤데이크|두통|🤕
stomachache|스터머케이크|배탈·복통|🤢
toothache|투쓰에이크|치통|🦷
fever|피버|열|🌡️
cough|코프|기침 (하다)|😷
sore throat|쏘어 쓰로트|목 아픔|🗣️`, `I/have=있다/a/headache=두통|머리가 아파요`),
    S('A2 병원에서', `
medicine|메디슨|약|💊
pharmacy|파머시|약국|🏥
appointment|어포인트먼트|(진료) 예약|📋
patient|페이션트|환자|🛌
dentist|덴티스트|치과 의사|🦷
pain|페인|통증|⚡`, `I/need=필요하다/some/medicine=약|약이 좀 필요해요`),
    S('A2 몸 상태', `
healthy|헬씨|건강한|💪
weak|위크|약한|🥀
dizzy|디지|어지러운|💫
better|베터|더 나은|📈
worse|워스|더 나쁜|📉
hurt|허트|아프다·다치다|🩹`, `I/feel=느끼다/better=더 나은/today=오늘|오늘은 몸이 나아졌어요`),
    S('A2 운동', `
exercise|엑서사이즈|운동 (하다)|🏃
jog|조그|조깅하다|👟
stretch|스트레치|스트레칭하다|🧘
gym|짐|헬스장|🏋️
sweat|스웨트|땀 (흘리다)|💦
team|팀|팀|👥`, `I/go=가다/to/the/gym=헬스장/twice=두 번/a/week=일주일|일주일에 두 번 헬스장에 가요`),
    S('A2 습관', `
habit|해빗|습관|🔁
diet|다이어트|식단·다이어트|🥗
vitamin|바이타민|비타민|🍊
stay up|스테이 업|늦게까지 안 자다|🌙
relax|릴랙스|쉬다·긴장을 풀다|😌
stress|스트레스|스트레스|😣`, `don't/stay=머무르다/up=깨어/too/late=늦게|너무 늦게까지 깨어 있지 마세요`)
  ] });
  U.push({ title: 'A2 · 여행', level: 'A2', stages: [
    S('A2 공항', `
passport|패스포트|여권|🛂
ticket|티켓|표|🎫
flight|플라이트|비행편|✈️
gate|게이트|탑승구|🚪
luggage|러기지|짐|🧳
delay|딜레이|지연 (되다)|⏳`, `where=어디/is/gate=탑승구/ten=10|10번 게이트가 어디예요?`),
    S('A2 호텔', `
check in|체크 인|체크인하다|🛎️
check out|체크 아웃|체크아웃하다|🚪
single room|싱글 룸|1인실|🛏️
view|뷰|경치·전망|🌅
front desk|프런트 데스크|안내 데스크|🛎️
wake-up call|웨이크업 콜|모닝콜|⏰`, `I'd/like=원하다/to/check=확인하다/in|체크인하고 싶어요`),
    S('A2 길 찾기', `
map|맵|지도|🗺️
turn|턴|돌다|↪️
cross|크로스|건너다|🚸
block|블록|블록 (한 구역)|🏘️
across from|어크로스 프럼|~ 맞은편에|↔️
lost|로스트|길을 잃은|😵`, `turn=돌다/left=왼쪽/at/the/corner=모퉁이|모퉁이에서 왼쪽으로 도세요`),
    S('A2 구경하기', `
museum|뮤지엄|박물관|🏛️
tour|투어|관광·견학|🚌
guide|가이드|안내원|🧑‍💼
souvenir|수버니어|기념품|🎁
famous|페이머스|유명한|⭐
crowded|크라우디드|붐비는|👥`, `this/place=장소/is/famous=유명한|이곳은 유명해요`),
    S('A2 교통', `
subway|서브웨이|지하철|🚇
bus stop|버스 스탑|버스 정류장|🚏
platform|플랫폼|승강장|🚉
transfer|트랜스퍼|갈아타다|🔀
fare|페어|요금|💳
ride|라이드|타다|🚲`, `where=어디/do/I/transfer=갈아타다|어디서 갈아타요?`)
  ] });
  U.push({ title: 'A2 · 일과 학교', level: 'A2', stages: [
    S('A2 회사', `
meeting|미팅|회의|👥
boss|보스|상사|🧑‍💼
coworker|코워커|동료|🧑‍🤝‍🧑
email|이메일|이메일|📧
project|프로젝트|프로젝트|📁
deadline|데드라인|마감|⏰`, `the/meeting=회의/starts=시작하다/at/ten|회의는 10시에 시작해요`),
    S('A2 일하기', `
job|잡|일·직업|💼
busy day|비지 데이|바쁜 하루|📆
finish|피니쉬|끝내다|🏁
plan|플랜|계획 (하다)|🗒️
salary|샐러리|월급|💰
holiday|할러데이|휴일·휴가|🏖️`, `I/finish=끝내다/work=일/at/six|저는 6시에 일을 끝내요`),
    S('A2 공부', `
lesson|레슨|수업|📚
homework|홈워크|숙제|📝
practice|프랙티스|연습 (하다)|🎯
mistake|미스테이크|실수|✏️
test|테스트|시험|💯
grade|그레이드|성적·학년|🅰️`, `I/practice=연습하다/English=영어/every/day|저는 매일 영어를 연습해요`),
    S('A2 교실 말', `
question|퀘스천|질문|❓
answer|앤서|대답·답|💬
example|이그잼플|예|🔍
word|워드|낱말|🔤
sentence|센턴스|문장|📄
meaning|미닝|뜻|💡`, `what=무엇/is/the/meaning=뜻/of/this/word=낱말|이 낱말은 무슨 뜻이에요?`),
    S('A2 컴퓨터', `
computer|컴퓨터|컴퓨터|💻
password|패스워드|비밀번호|🔑
website|웹사이트|웹사이트|🌐
download|다운로드|내려받다|⬇️
message|메시지|메시지|💬
online|온라인|인터넷에서|📶`, `I/forgot=잊었다/my/password=비밀번호|비밀번호를 잊어버렸어요`)
  ] });
  U.push({ title: 'A2 · 마음과 성격', level: 'A2', stages: [
    S('A2 기분', `
lonely|론리|외로운|🥺
nervous|너버스|긴장한|😬
proud|프라우드|자랑스러운|🥇
surprised|서프라이즈드|놀란|😲
bored|보어드|지루한|🥱
worried|워리드|걱정하는|😟`, `I'm/so=정말/proud=자랑스러운/of/you|네가 정말 자랑스러워`),
    S('A2 성격', `
shy|샤이|수줍은|☺️
friendly|프렌들리|다정한·친근한|🤗
honest|아니스트|정직한|🙋
lazy|레이지|게으른|🦥
smart|스마트|똑똑한|🧠
brave|브레이브|용감한|🦁`, `my/husband=남편/is/very/friendly=다정한|남편은 아주 다정해요`),
    S('A2 마음 표현', `
hope|호프|바라다·희망|🌈
wish|위쉬|바라다·소원|🌠
miss|미스|그리워하다|💭
worry|워리|걱정하다|😟
believe|빌리브|믿다|🙏
care|케어|신경 쓰다·돌보다|💗`, `I/miss=그리워하다/you|보고 싶어요`),
    S('A2 칭찬과 위로', `
great job|그레이트 잡|잘했어|👏
don't worry|돈트 워리|걱정 마|🤝
cheer up|치어 업|힘내|💪
take care|테이크 케어|몸조심해|🍀
congratulations|컨그래출레이션즈|축하해요|🎉
good luck|굿 럭|행운을 빌어|🍀`, `don't/worry=걱정하다/I'm/here=여기|걱정 마, 내가 있잖아`),
    S('A2 관계', `
couple|커플|부부·커플|💑
wedding|웨딩|결혼식|💒
anniversary|애니버서리|기념일|🎂
gift|기프트|선물|🎁
date|데이트|데이트·날짜|📅
together|투게더|함께|🤝`, `happy=행복한/anniversary=기념일|기념일 축하해`)
  ] });
  U.push({ title: 'A2 · 날씨와 자연', level: 'A2', stages: [
    S('A2 날씨 더', `
storm|스톰|폭풍|⛈️
fog|포그|안개|🌫️
humid|휴미드|습한|💦
freezing|프리징|몹시 추운|🥶
forecast|포캐스트|일기 예보|📺
temperature|템퍼러처|기온·온도|🌡️`, `it's/freezing=몹시 추운/outside=밖|밖이 엄청 추워요`),
    S('A2 자연', `
forest|포레스트|숲|🌲
lake|레이크|호수|🏞️
island|아일랜드|섬|🏝️
hill|힐|언덕|⛰️
sand|샌드|모래|🏖️
wave|웨이브|파도|🌊`, `we/walked=걸었다/in/the/forest=숲|우리는 숲에서 걸었어요`),
    S('A2 하늘과 땅', `
sunset|선셋|해 질 녘|🌇
sunrise|선라이즈|해돋이|🌄
rainbow|레인보우|무지개|🌈
earth|어쓰|지구·땅|🌍
rock|락|바위|🪨
field|필드|들판|🌾`, `look=보다/at/the/rainbow=무지개|저 무지개 좀 봐요`),
    S('A2 식물', `
plant|플랜트|식물·심다|🪴
seed|시드|씨앗|🌱
root|루트|뿌리|🌿
grow|그로우|자라다·기르다|📈
bloom|블룸|(꽃이) 피다|🌸
water the plants|워터 더 플랜츠|식물에 물 주다|💧`, `I/water=물 주다/the/plants=식물/every/morning|매일 아침 식물에 물을 줘요`),
    S('A2 동물 더', `
insect|인섹트|곤충|🐞
butterfly|버터플라이|나비|🦋
bee|비|벌|🐝
frog|프로그|개구리|🐸
squirrel|스쿼럴|다람쥐|🐿️
owl|아울|부엉이|🦉`, `a/butterfly=나비/is/on/the/flower=꽃|나비가 꽃 위에 있어요`)
  ] });
  U.push({ title: 'A2 · 시간과 계획', level: 'A2', stages: [
    S('A2 시간 말', `
soon|순|곧|⏳
later|레이터|나중에|🕓
early|얼리|이른·일찍|🐓
already|올레디|벌써|✅
still|스틸|아직도|⏸️
ago|어고|~ 전에|⬅️`, `I'll/call=전화하다/you/later=나중에|나중에 전화할게요`),
    S('A2 빈도', `
once|원스|한 번|1️⃣
twice|트와이스|두 번|2️⃣
daily|데일리|매일의|📆
weekly|위클리|매주의|🗓️
rarely|레얼리|좀처럼 ~ 않는|🦄
every night|에브리 나잇|매일 밤|🌙`, `I/call=전화하다/my/mom=엄마/once=한 번/a/week|저는 일주일에 한 번 엄마에게 전화해요`),
    S('A2 약속', `
promise|프라미스|약속 (하다)|🤙
invite|인바이트|초대하다|💌
party|파티|파티|🥳
join|조인|함께하다|➕
cancel|캔슬|취소하다|🚫
free time|프리 타임|여가 시간|🕊️`, `do/you/want=원하다/to/join=함께하다/us|우리랑 같이 할래요?`),
    S('A2 미래', `
future|퓨처|미래|🔮
dream|드림|꿈 (꾸다)|💭
someday|섬데이|언젠가|🌟
decide|디사이드|결정하다|✔️
prepare|프리페어|준비하다|🎒
next year|넥스트 이어|내년|🎆`, `someday=언젠가/I/want=원하다/to/visit=방문하다/London=런던|언젠가 런던에 가 보고 싶어요`),
    S('A2 날짜', `
date of birth|데이트 오브 버스|생년월일|🎂
calendar|캘린더|달력|📅
birthday party|버스데이 파티|생일 파티|🎈
week|위크|주|7️⃣
last week|래스트 위크|지난주|⏮️
the day after tomorrow|더 데이 애프터 투마로|모레|⏭️`, `see/you=너/the/day=날/after=후/tomorrow=내일|모레 봐요`)
  ] });
  U.push({ title: 'A2 · 자주 쓰는 동사 2', level: 'A2', stages: [
    S('A2 움직임', `
carry|캐리|나르다|📦
push|푸쉬|밀다|👐
pull|풀|당기다|🪢
climb|클라임|오르다|🧗
drop|드롭|떨어뜨리다|⬇️
throw|쓰로우|던지다|🤾`, `can/you/carry=나르다/this/box=상자|이 상자 좀 들어 줄래요?`),
    S('A2 생각과 말', `
explain|익스플레인|설명하다|🧑‍🏫
agree|어그리|동의하다|👍
guess|게스|추측하다|🤔
mean|민|뜻하다|💡
repeat|리피트|반복하다|🔁
spell|스펠|철자를 말하다|🔤`, `could/you/repeat=반복하다/that=그것|다시 한번 말해 줄래요?`),
    S('A2 주고받기', `
borrow|바로우|빌리다|🤲
lend|렌드|빌려주다|🫴
keep|킵|가지고 있다·계속하다|🗝️
lose|루즈|잃어버리다|❓
find|파인드|찾다|🔎
show|쇼우|보여 주다|👀`, `can/I/borrow=빌리다/your/pen=펜|펜 좀 빌려도 돼요?`),
    S('A2 변화', `
become|비컴|~이 되다|🦋
switch|스위치|바꾸다·전환하다|🔀
turn on|턴 온|켜다|💡
turn off|턴 오프|끄다|🌑
fill|필|채우다|🫙
empty|엠프티|빈·비우다|🫗`, `please/turn=돌리다/off=끄다/the/light=불|불 좀 꺼 주세요`),
    S('A2 하루 동작', `
hurry|허리|서두르다|🏃
arrive late|어라이브 레이트|늦게 도착하다|🐌
pick up|픽 업|데리러 가다·줍다|🚗
drop off|드롭 오프|내려 주다|🚕
look for|룩 포|찾다|🔍
put on|풋 온|입다·바르다|🧥`, `I'm/looking=보다/for/my/keys=열쇠|열쇠를 찾고 있어요`)
  ] });
})();
