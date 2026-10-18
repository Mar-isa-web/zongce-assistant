# 一次性脚本：把已填写的《清远校区综合测评表.docx》掏空成 docxtemplater 模板
# 产出：templates/综测表_template.docx（无个人数据，可入仓库）
#
# 施工原则（侦察结论，勿改回纯索引）：
#   1. 所有填充点按"内容特征"定位（唯一匹配断言），绝不用扁平格子索引——
#      这张表合并单元格极多，任何索引在源文件微调后都会漂移。
#   2. 遍历用物理 tc 元素（tr_lst/tc_lst），不用 row.cells（合并格会重复出现）。
#   3. 生成后自检：全文不得残留任何个人数据，模板标签数量必须恰好匹配。
#
# 用法：python scripts/make_word_template.py [源docx] [输出docx]
import copy
import sys
from pathlib import Path

import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.table import _Cell

REPO = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"C:\Users\AAA\Desktop\gduf\zcode-综测整理\清远校区综合测评表.docx")
DST = Path(sys.argv[2]) if len(sys.argv) > 2 else REPO / "templates" / "综测表_template.docx"

W = qn("w:t").split("}")[0] + "}"  # wordprocessingml 命名空间


def tc_text(tc) -> str:
    return "\n".join("".join(t.text or "" for t in p.findall(".//" + W + "t")) for p in tc.findall(W + "p"))


def iter_cells(table):
    """按文档顺序产出物理格子（合并格只出现一次）"""
    for tr in table._tbl.tr_lst:
        for tc in tr.tc_lst:
            yield _Cell(tc, table)


def find_one(table, tno, pred, desc):
    hits = [c for c in iter_cells(table) if pred(c)]
    assert len(hits) == 1, f"表{tno}「{desc}」期望唯一匹配，实际 {len(hits)} 个"
    return hits[0]


def set_p_text(p_el, text: str, wipe: bool = False) -> None:
    """替换段落文本：保留第一个带格式的 run 的 rPr（其次用段落标记的 rPr）。
    wipe=True 时清掉段落里除 pPr 外的全部子元素（连 OMML 公式、书签一起清）。"""
    runs = p_el.findall(qn("w:r"))
    rpr = None
    for r in runs:
        e = r.find(qn("w:rPr"))
        if e is not None:
            rpr = copy.deepcopy(e)
            break
    if rpr is None:
        ppr = p_el.find(qn("w:pPr"))
        if ppr is not None:
            e = ppr.find(qn("w:rPr"))
            if e is not None:
                rpr = copy.deepcopy(e)
    if wipe:
        for child in list(p_el):
            if child.tag != qn("w:pPr"):
                p_el.remove(child)
    else:
        for r in runs:
            p_el.remove(r)
    r = p_el.makeelement(qn("w:r"), {})
    if rpr is not None:
        r.append(rpr)
    t = p_el.makeelement(qn("w:t"), {})
    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    t.text = text
    r.append(t)
    p_el.append(r)


def cell_set(cell: _Cell, lines: list[str], wipe_first: bool = False) -> None:
    """把格子重建为 lines（每项一段），全部沿用第一段的格式"""
    assert cell.paragraphs, "格子没有段落"
    first = cell.paragraphs[0]._p
    set_p_text(first, lines[0], wipe=wipe_first)
    tmpl = copy.deepcopy(first)
    for p in cell.paragraphs[1:]:
        p._element.getparent().remove(p._element)
    anchor = first
    for line in lines[1:]:
        np = copy.deepcopy(tmpl)
        set_p_text(np, line)
        anchor.addnext(np)
        anchor = np


def first_para_set(cell: _Cell, text: str) -> None:
    """只改第一段（总分格：保留认定/审核两行）"""
    set_p_text(cell.paragraphs[0]._p, text)


doc = docx.Document(SRC)
assert len(doc.tables) == 7, f"期望 7 张表，实际 {len(doc.tables)}"
T = doc.tables
strip = lambda s: s.strip()

# ===== 表0 表头 =====
for old, tag in [
    ("江圳宇", "{name}"),
    ("2515435", "{className}"),
    ("251543528", "{studentId}"),
    ("计算机学院", "{college}"),
    ("计算机科学与技术", "{major}"),
    ("13266788776", "{phone}"),
]:
    cell_set(find_one(T[0], 0, lambda c: strip(c.text) == old, old), [tag])

# ===== 表1 德育 =====
cell_set(find_one(T[1], 1, lambda c: strip(c.text) == "100", "德育基础分原始总分"), ["{deBaseRaw}"])
cell_set(find_one(T[1], 1, lambda c: strip(c.text) == "30.00", "德育基础分折算"), ["{deBaseConv}"])
# 互评分行：含"德育互评分"标签的那一物理行（跳过标题行——公式文本也含这四个字），行内最后两个格子 = 互评原始总分 / 折算分
peer_tr = next(
    tr for tr in T[1]._tbl.tr_lst
    if len(tr.tc_lst) == 8 and any("德育互评分" in tc_text(tc) for tc in tr.tc_lst)
)
assert len(peer_tr.tc_lst) == 8, f"德育互评分行期望 8 个格子，实际 {len(peer_tr.tc_lst)}"
set_p_text(peer_tr.tc_lst[-2].findall(W + "p")[0], "{dePeerRaw}")
set_p_text(peer_tr.tc_lst[-1].findall(W + "p")[0], "{dePeerConv}")
# 加分条目格 → docxtemplater 循环三段式 + 自评分行
ITEM = "{no}. {title}，+{points}（{itemNo}）"
cell_set(
    find_one(T[1], 1, lambda c: c.text.startswith("1. ") and "自评原始分" in c.text, "德育加分条目格"),
    ["{#deItems}", ITEM, "{/deItems}", "自评原始分：{deSelfRaw}，自评折算分：{deSelfConv}"],
)
cell_set(find_one(T[1], 1, lambda c: "自评扣分" in c.text, "德育自评扣分"), ["自评扣分：{deDeduct}"])
first_para_set(
    find_one(T[1], 1, lambda c: c.text.startswith("学生自评原始总分"), "德育总分格"),
    "学生自评原始总分：{deTotalRaw}，折算总分：{deTotalConv}",
)

# ===== 表2 智育 =====
cell_set(
    find_one(T[2], 2, lambda c: "智育基础分" in c.text and "（一）" in c.text, "智育基础分（含绩点公式，替换为文本版）"),
    ["（一）智育基础分 = 本人绩点÷专业第一绩点×100 = {zhiBaseRaw}　折算分：{zhiBaseConv}"],
    wipe_first=True,  # 原格含 OMML 绩点公式（不在 w:r 里），必须整体清除
)
cell_set(
    find_one(T[2], 2, lambda c: c.text.startswith("1. ") and "自评原始分" in c.text, "智育加分条目格"),
    ["{#zhiItems}", ITEM, "{/zhiItems}", "自评原始分：{zhiSelfRaw}，自评折算分：{zhiSelfConv}"],
)
first_para_set(
    find_one(T[2], 2, lambda c: c.text.startswith("学生自评原始总分"), "智育总分格"),
    "学生自评原始总分：{zhiTotalRaw}，折算总分：{zhiTotalConv}",
)

# ===== 表3 体育 =====
cell_set(
    find_one(T[3], 3, lambda c: "体育基础分" in c.text and "（一）" in c.text, "体育基础分"),
    ["（一）体育基础分　　原始分：{tiBaseRaw}，折算分：{tiBaseConv}"],
)
cell_set(
    find_one(T[3], 3, lambda c: c.text.startswith("1. ") and "自评原始分" in c.text, "体育加分条目格"),
    ["{#tiItems}", ITEM, "{/tiItems}", "自评原始分：{tiSelfRaw}，自评折算分：{tiSelfConv}"],
)
cell_set(find_one(T[3], 3, lambda c: "自评扣分" in c.text, "体育自评扣分"), ["自评扣分：{tiDeduct}"])
first_para_set(
    find_one(T[3], 3, lambda c: c.text.startswith("学生自评原始总分"), "体育总分格"),
    "学生自评原始总分：{tiTotalRaw}，折算总分：{tiTotalConv}",
)

# ===== 表4 美育 =====
cell_set(
    find_one(T[4], 4, lambda c: c.text.startswith("原始分："), "美育基础分值格"),
    ["原始分：{meiBaseRaw}", "折算分：{meiBaseConv}"],
)
peers = [c for c in iter_cells(T[4]) if c.text.startswith("互评分")]
assert len(peers) == 2, f"美育互评分格期望 2 个，实际 {len(peers)}"
cell_set(peers[0], ["互评分：{meiPeerRaw}"])  # 子项1（美育能力）放系统里的互评分合计
cell_set(peers[1], ["互评分：—"])  # 子项2：系统未分项，留空由班级填写
cell_set(
    find_one(T[4], 4, lambda c: c.text.startswith("1. ") and "自评原始分" in c.text, "美育加分条目格"),
    ["{#meiItems}", ITEM, "{/meiItems}", "自评原始分：{meiSelfRaw}，自评折算分：{meiSelfConv}"],
)
cell_set(find_one(T[4], 4, lambda c: "自评扣分" in c.text, "美育自评扣分"), ["自评扣分：{meiDeduct}"])
first_para_set(
    find_one(T[4], 4, lambda c: c.text.startswith("学生自评原始总分"), "美育总分格"),
    "学生自评原始总分：{meiTotalRaw}，折算总分：{meiTotalConv}",
)

# ===== 表5 劳育 =====
cell_set(
    find_one(T[5], 5, lambda c: "劳育基础分" in c.text and "（一）" in c.text, "劳育基础分"),
    ["（一）劳育基础分　　原始分：{laoBaseRaw}，折算分：{laoBaseConv}"],
)
lao_items = find_one(T[5], 5, lambda c: "自评原始分" in c.text and not c.text.startswith("学生自评原始总分"), "劳育加分条目格（空白）")
cell_set(
    lao_items,
    ["{#laoItems}", ITEM, "{/laoItems}", "自评原始分：{laoSelfRaw}，自评折算分：{laoSelfConv}"],
)
for p in lao_items.paragraphs:  # 原空格是居中对齐，条目应与其他育一致左对齐
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
cell_set(find_one(T[5], 5, lambda c: "自评扣分" in c.text, "劳育自评扣分"), ["自评扣分：{laoDeduct}"])
first_para_set(
    find_one(T[5], 5, lambda c: c.text.startswith("学生自评原始总分"), "劳育总分格"),
    "学生自评原始总分：{laoTotalRaw}，折算总分：{laoTotalConv}",
)

# ===== 表6 汇总：按表格标注"本部分均由学院审核小组填写"，整体留空 =====

# ===== 保存 + 自检 =====
DST.parent.mkdir(parents=True, exist_ok=True)
doc.save(DST)

check = docx.Document(DST)
all_text = "\n".join(
    tc_text(tc) for t in check.tables for tr in t._tbl.tr_lst for tc in tr.tc_lst
)
forbidden = [
    "江圳宇", "251543528", "13266788776", "蓝桥杯", "力挽狂", "破茧成蝶",
    "新媒体中心", "军训先进个人", "86.50", "85.80", "53.54", "56.50", "51.48",
    "75.20", "52.64", "113", "计算机科学与技术",
]
leaked = [w for w in forbidden if w in all_text]
assert not leaked, f"模板残留个人数据: {leaked}"

expected = ["{name}", "{className}", "{studentId}", "{college}", "{major}", "{phone}"]
for p in ["de", "zhi", "ti", "mei", "lao"]:
    expected += [f"{{#{p}Items}}", f"{{/{p}Items}}", f"{{{p}SelfRaw}}", f"{{{p}SelfConv}}",
                 f"{{{p}TotalRaw}}", f"{{{p}TotalConv}}"]
expected += ["{deBaseRaw}", "{deBaseConv}", "{dePeerRaw}", "{dePeerConv}", "{deDeduct}",
             "{zhiBaseRaw}", "{zhiBaseConv}", "{tiBaseRaw}", "{tiBaseConv}", "{tiDeduct}",
             "{meiBaseRaw}", "{meiBaseConv}", "{meiPeerRaw}", "{meiDeduct}",
             "{laoBaseRaw}", "{laoBaseConv}", "{laoDeduct}"]
missing = [t for t in expected if t not in all_text]
assert not missing, f"模板缺少标签: {missing}"

print(f"模板已生成: {DST}")
print(f"标签数: {len(expected)} 全部就位；循环内字段 no/title/points/itemNo ×5 未逐一断言（渲染期验证）")
