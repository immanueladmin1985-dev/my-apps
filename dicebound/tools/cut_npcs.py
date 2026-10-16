"""NPC 전신 시트(1536×1024, 마젠타 바탕, 2줄 × 6명)를 잘라 assets/npc 에 저장한다.
사용법: python3 dicebound/tools/cut_npcs.py <npc-sheet.png> dicebound/assets/npc"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutlib import cut_grid

cut_grid(sys.argv[1], sys.argv[2], [
    ['merchant', 'mystic', 'innkeeper', 'villager', 'healer', 'rogue'],
    ['blacksmith', 'questgiver', 'librarian', 'shopkeeper', 'nun', 'maid'],
], max_side=560)
