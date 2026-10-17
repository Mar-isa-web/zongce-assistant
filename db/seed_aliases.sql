-- 规则的"常见例子"关键词与计量单位（切片3a）
-- aliases：逗号分隔，录入页搜索用——让"军训先进个人"能搜到"其他各类先进个人"
-- unit：按量计分的计量单位（篇/次/小时），分值 = points × 数量

-- ===== 计量单位（按量计分）=====
UPDATE rules SET unit='篇'  WHERE dimension='德育' AND item_no=6 AND grade LIKE '读书笔记%';
UPDATE rules SET unit='次'  WHERE dimension='德育' AND item_no=6 AND grade LIKE '%讲座%';
UPDATE rules SET unit='小时' WHERE dimension='德育' AND item_no=6 AND grade LIKE '%志愿%';
UPDATE rules SET unit='次'  WHERE dimension='智育' AND item_no=2 AND grade LIKE '%讲座%';

-- ===== 德育 =====
UPDATE rules SET aliases='班长,副班长,团支书,团支部书记' WHERE dimension='德育' AND item_no=1 AND level='班级' AND grade LIKE '（正副）班长%';
UPDATE rules SET aliases='学习委员,班主任助理,助班' WHERE dimension='德育' AND item_no=1 AND level='班级' AND grade LIKE '学习委员%';
UPDATE rules SET aliases='班委,团支委,组织委员,宣传委员' WHERE dimension='德育' AND item_no=1 AND level='班级' AND grade LIKE '其他班委%';
UPDATE rules SET aliases='宿舍长,楼长,层长,寝室长' WHERE dimension='德育' AND item_no=1 AND level='班级' AND grade LIKE '宿舍长%';
UPDATE rules SET aliases='课代表,科代表' WHERE dimension='德育' AND item_no=1 AND level='班级' AND grade='课代表';
UPDATE rules SET aliases='部长,组长,副部长' WHERE dimension='德育' AND item_no=1 AND level='院级' AND grade LIKE '二级负责人%';
UPDATE rules SET aliases='干事,部门成员,部委' WHERE dimension='德育' AND item_no=1 AND level='院级' AND grade='干事';
UPDATE rules SET aliases='三好学生,优秀学生干部,优秀团员,优秀团干' WHERE dimension='德育' AND item_no=2 AND level='校级' AND grade LIKE '三好学生%';
UPDATE rules SET aliases='军训先进个人,军训优秀个人,征兵先进个人,优秀志愿者,先进个人' WHERE dimension='德育' AND item_no=2 AND level='校级' AND grade LIKE '其他各类先进个人%';
UPDATE rules SET aliases='优秀共产党员,优秀共青团员,优秀共青团干部,优党,优团,优干' WHERE dimension='德育' AND item_no=2 AND level='院级' AND grade LIKE '优党%';
UPDATE rules SET aliases='先进团支部,五四红旗团支部,文明班级' WHERE dimension='德育' AND item_no=2 AND level='校级' AND grade='一般成员';
UPDATE rules SET aliases='知识竞赛,征文,演讲,辩论,朗诵,打卡活动,雷锋月,游园,晚会' WHERE dimension='德育' AND item_no=3 AND level='校级' AND grade='参与/参评未获奖';
UPDATE rules SET aliases='知识竞赛,征文,演讲,辩论,朗诵,主题活动' WHERE dimension='德育' AND item_no=3 AND level='院级' AND grade='参与/参评未获奖';
UPDATE rules SET aliases='三下乡,社会实践团队,暑期实践' WHERE dimension='德育' AND item_no=4 AND level='院级' AND grade='参与未获奖-队员';
UPDATE rules SET aliases='校报,公众号发表,推文,金曦,校运会快讯' WHERE dimension='德育' AND item_no=5 AND level='校级' AND grade LIKE '校报%';
UPDATE rules SET aliases='献血,献血证,无偿献血证' WHERE dimension='德育' AND item_no=6 AND grade='无偿献血';
UPDATE rules SET aliases='青马班,青马工程,党校结业,党课优秀学员,团校' WHERE dimension='德育' AND item_no=6 AND grade LIKE '党校%';
UPDATE rules SET aliases='读书笔记,读书心得,读后感,阅读笔记' WHERE dimension='德育' AND item_no=6 AND grade LIKE '%读书笔记%';
UPDATE rules SET aliases='讲座,学习讲座,思政讲座' WHERE dimension='德育' AND item_no=6 AND grade LIKE '%讲座%';
UPDATE rules SET aliases='志愿服务,志愿时长,义工,i志愿,志愿汇,公益活动' WHERE dimension='德育' AND item_no=6 AND grade LIKE '%志愿%';

-- ===== 智育 =====
UPDATE rules SET aliases='蓝桥杯,挑战杯,互联网加,数学建模,ACM,程序设计竞赛,技能竞赛' WHERE dimension='智育' AND item_no=1 AND level='省级' AND grade LIKE '二等奖%';
UPDATE rules SET aliases='参与者,参赛,参赛未获奖' WHERE dimension='智育' AND item_no=1 AND level='校级' AND grade='参与/参评未获奖';
UPDATE rules SET aliases='大创,攀登计划,创新创业项目,科研项目立项' WHERE dimension='智育' AND item_no=2 AND level='国家级' AND grade='负责人';
UPDATE rules SET aliases='发表论文,论文发表,期刊,学报' WHERE dimension='智育' AND item_no=3 AND level='省级' AND grade='学术论文-公开刊物发表';
UPDATE rules SET aliases='发明专利,专利授权' WHERE dimension='智育' AND item_no=4 AND grade='发明专利-个人被授予';
UPDATE rules SET aliases='CET4,英语四级,四级证书' WHERE dimension='智育' AND item_no=5 AND grade='大学英语四级';
UPDATE rules SET aliases='CET6,英语六级,六级证书' WHERE dimension='智育' AND item_no=5 AND grade='大学英语六级';
UPDATE rules SET aliases='计算机二级,NCRE,计算机等级考试,初级证书' WHERE dimension='智育' AND item_no=5 AND grade='职业技能证书-初级';

-- ===== 体育 =====
UPDATE rules SET aliases='校运会,田径运动会,运动会' WHERE dimension='体育' AND item_no=1 AND level='校级' AND grade='参与未获奖';
UPDATE rules SET aliases='篮球赛,足球赛,排球赛,球类比赛,趣味运动,越野赛' WHERE dimension='体育' AND item_no=2 AND level='校级' AND grade='参与/参评未获奖';

-- ===== 美育 =====
UPDATE rules SET aliases='文艺演出,歌唱比赛,舞蹈比赛,摄影,绘画,海报设计,影剧鉴赏' WHERE dimension='美育' AND item_no=1 AND level='校级' AND grade='参与/参评未获奖';

-- ===== 劳育 =====
UPDATE rules SET aliases='星级宿舍,五星宿舍,文明宿舍评比' WHERE dimension='劳育' AND item_no=1 AND level='校级' AND grade LIKE '五星宿舍-普通成员';
UPDATE rules SET aliases='劳动模范,劳模' WHERE dimension='劳育' AND item_no=2 AND grade LIKE '劳动模范%';
