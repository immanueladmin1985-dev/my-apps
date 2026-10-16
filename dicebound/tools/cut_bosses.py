"""보스·정예 전신 시트(1536×1024, 마젠타 바탕, 2줄 × 5명)를 잘라 assets/mobs 에 저장한다.
사용법: python3 dicebound/tools/cut_bosses.py <boss-sheet.png> dicebound/assets/mobs"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutlib import cut_grid

cut_grid(sys.argv[1], sys.argv[2], [
    ['boss-abyss', 'boss-hell-lord', 'ice-queen', 'thorn-witch', 'crimson-warden'],
    ['boss-necromancer', 'flame-dancer', 'wolf-mistress', 'boss-fallen-knight', 'blood-duchess'],
])
