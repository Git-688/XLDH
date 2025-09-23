// 导航数据
const navigationData = {
    categories: [
        {
            id: "recommend",
            name: "推荐",
            icon: "fas fa-star",
            subcategories: [
                {
                    id: "useful",
                    name: "其他",
                    sites: [
                        {
                            name: "数据分析平台",
                            description: "提供全面的数据分析和可视化工具",
                            icon: {
                                type: "text",
                                value: "📊"
                            },
                            url: "https://example.com/data-analysis"
                        },
                        {
                            name: "文档协作工具",
                            description: "实时协作编辑文档，提高团队效率",
                            icon: {
                                type: "text",
                                value: "📝"
                            },
                            url: "https://example.com/collaboration"
                        },
                        {
                            name: "云存储服务",
                            description: "安全可靠的云存储解决方案",
                            icon: {
                                type: "text",
                                value: "🖥️"
                            },
                            url: "https://example.com/cloud-storage"
                        }
                    ]
                },
                {
                    id: "other",
                    name: "API",
                    sites: [
                        {
                            name: "酷酷API",
                            description: "提升工作效率的实用工具",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png"
                            },
                            url: "https://api.zxki.cn/"
                        },
                        {
                            name: "BugPk-Api",
                            description: "激发创意的设计资源库",
                            icon: {
                                type: "image",
                                value: "https://api.bugpk.com/logo.png"
                            },
                            url: "https://api.bugpk.com/"
                        },
                        {
                            name: "小渡科技",
                            description: "提供优质在线学习资源",
                            icon: {
                                type: "image",
                                value: "https://api.dwo.cc/Public/Uploads/Images/de9a96878ccd24038301a3451b480053.png"
                            },
                            url: "https://api.dwo.cc/?ref=bugpk"
                        },
                        {
                            name: "稳定API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.xingchenfu.xyz/?ref=bugpk"
                        },
                        {
                            name: "云智API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.jkyai.top/"
                        },
                        {
                            name: "优创API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://img.uctb.cn/view.php/e69a2b87425c7d897c0ebc4717453291.png" // 外部图片链接
                            },
                            url: "https://api.uctb.cn/"
                        },
                        {
                            name: "燃雨API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://ranyu.sbs/"
                        },
                        {
                            name: "西瓜糖API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.nki.pw/"
                        },
                        {
                            name: "迟言API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://cyapi.top/"
                        },
                        {
                            name: "ARY API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.aary.top/"
                        },
                        {
                            name: "愿想API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://xiaodi.jujukai.cn/"
                        },
                        {
                            name: "YKXBL-API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://pine.delivo.top/"
                        },
                        {
                            name: "繁华落幕のapi",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.s01s.cn/"
                        },
                        {
                            name: "小梦想API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.magisk.icu/"
                        },
                        {
                            name: "浅夏API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://cxk001.free.svipss.top/"
                        },
                        {
                            name: "七七API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://wwm.34bc.com/"
                        },
                        {
                            name: "小虫API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://ovo1.cc/"
                        },
                        {
                            name: "苏青API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://sucyan.cfd/"
                        },
                        {
                            name: "星宇云API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.fohok.xin/"
                        },
                        {
                            name: "云综合API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.03c3.cn/"
                        },
                        {
                            name: "如诗API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.likepoems.com/"
                        },
                        {
                            name: "Brick-API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.54dh.cn/"
                        },
                        {
                            name: "小鹏API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://lipenglei.com/webpage/api/"
                        },
                        {
                            name: "恋酱API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://api.cmvip.cn/"
                        },
                        {
                            name: "酷乐API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.kuleu.com/"
                        },
                        {
                            name: "免费API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.aa1.cn/"
                        },
                        {
                            name: "龙珠API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.hhlqilongzhu.cn/assets/resource/favicon.png" // 外部图片链接
                            },
                            url: "https://www.hhlqilongzhu.cn/"
                        },
                        {
                            name: "笒鬼鬼API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.cenguigui.cn/"
                        },
                        {
                            name: "星之阁API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.xingzhige.com/favicon.ico" // 外部图片链接
                            },
                            url: "https://api.xingzhige.com/"
                        },
                        {
                            name: "小小API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://xxapi.cn/"
                        },
                        {
                            name: "希速运API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.sdbj.top/"
                        },
                        {
                            name: "无铭API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://jkapi.com/?ref=api.sdbj.top"
                        },
                        {
                            name: "PearAPI",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.pearktrue.cn/favicon.ico" // 外部图片链接
                            },
                            url: "https://api.pearktrue.cn/dashboard/home"
                        },
                        {
                            name: "倾梦API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "http://api.317ak.cn/Public/Uploads/Images/95bf24d00fd18cc2102a00cdc1efc0d1.ico" // 外部图片链接
                            },
                            url: "https://api.317ak.com/"
                        },
                        {
                            name: "MiloraAPI",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.milorapart.top/favicon.ico" // 外部图片链接
                            },
                            url: "https://api.milorapart.top/"
                        },
                        {
                            name: "kylinAPI",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.qlwc.cn/favicon.ico" // 外部图片链接
                            },
                            url: "https://api.qlwc.cn/"
                        },
                        {
                            name: "公共API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://qqlykm.cn/"
                        },
                        {
                            name: "问情免费API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://free.wqwlkj.cn/"
                        },
                        {
                            name: "桑帛云API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.lolimi.cn/"
                        },
                        {
                            name: "客官API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.keguan.org.cn/"
                        },
                        {
                            name: "存雨API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.cunyuapi.top/"
                        },
                        {
                            name: "陌染API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://apii.xhcmz.cn/assets/img/favicons/favicon.png" // 外部图片链接
                            },
                            url: "https://apii.xhcmz.cn/"
                        },
                        {
                            name: "狗哥API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.mhimg.cn/"
                        },
                        {
                            name: "山河API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.shanhe.kim/assets/img/favicons/favicon.png" // 外部图片链接
                            },
                            url: "https://api.shanhe.kim/"
                        },
                        {
                            name: "苏苏API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.xn--ei1aa.cn/"
                        },
                        {
                            name: "苏慕白API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.sumubai.cn/assets/img/favicons/favicon.png" // 外部图片链接
                            },
                            url: "https://api.sumubai.cn/"
                        },
                        {
                            name: "简心API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.qvqa.cn/"
                        },
                        {
                            name: "维梦API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.52vmy.cn/favicon.ico" // 外部图片链接
                            },
                            url: "https://api.52vmy.cn/"
                        },
                        {
                            name: "DP-API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.dudunas.top/assets/img/favicons/favicon.png" // 外部图片链接
                            },
                            url: "https://api.dudunas.top/"
                        },
                        {
                            name: "咔咔云API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.kkjsz.cn/type/free"
                        },
                        {
                            name: "独角兽API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://cdn.apifox.com/app/project-icon/custom/20230824/996bc720-8334-4c8c-8ba5-ef3aa1283530.png" // 外部图片链接
                            },
                            url: "https://d.ovooa.cc/"
                        },
                        {
                            name: "彬红茶API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.redcha.cn/"
                        },
                        {
                            name: "小星API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.xiaoxing.site/"
                        },
                        {
                            name: "慕名API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://xiaoapi.cn/"
                        },
                        {
                            name: "落心秋",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://missqiu.icu/"
                        },
                        {
                            name: "Xtn-API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.521567.xyz/"
                        },
                        {
                            name: "辛奈API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://8.137.14.126/#goTop"
                        },
                        {
                            name: "接口盒子",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.apihz.cn/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.apihz.cn/"
                        },
                        {
                            name: "星海API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.xinghai.ddns-ip.net/"
                        },
                        {
                            name: "芒果API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://mgyy.asia/"
                        },
                        {
                            name: "凌熙API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://lingxi.jujukai.cn/"
                        },
                        {
                            name: "糖豆子API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.tangdouz.com/"
                        },
                        {
                            name: "Tmini",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://tmini.net/"
                        },
                        {
                            name: "APIStore",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://apis.jxcxin.cn/"
                        },
                        {
                            name: "搏天API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://api.btstu.cn/"
                        },
                        {
                            name: "AbeimAPI",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://res.abeim.cn/api/"
                        },
                        {
                            name: "HYWL-API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.52hyjs.com/favicon.ico" // 外部图片链接
                            },
                            url: "https://api.52hyjs.com/"
                        },
                        {
                            name: "零艺客API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.lykep.com/"
                        },
                        {
                            name: "艺连数据",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.yuanxiapi.cn/"
                        },
                        {
                            name: "UomgAPI",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.uomg.com/"
                        },
                        {
                            name: "保罗API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.paugram.com/"
                        },
                        {
                            name: "DOuAPI",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.daidr.me/#/"
                        },
                        {
                            name: "苏画API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.qemao.com/"
                        },
                        {
                            name: "素颜API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.suyanw.cn/favicon.ico" // 外部图片链接
                            },
                            url: "https://api.suyanw.cn/"
                        },
                        {
                            name: "小执API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "http://api.xzboke.cn/favicon.ico" // 外部图片链接
                            },
                            url: "http://api.xzboke.cn/"
                        },
                        {
                            name: "小言API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://api.zxz.ee/"
                        },
                        {
                            name: "OIAPI",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://oiapi.net/favicon.ico" // 外部图片链接
                            },
                            url: "https://oiapi.net/"
                        },
                        {
                            name: "云萌阁API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.yunmge.com/assets/img/ico/favicon.ico" // 外部图片链接
                            },
                            url: "https://api.yunmge.com/"
                        },
                        {
                            name: "98情缘API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.98qy.com/"
                        },
                        {
                            name: "优享云API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.ahfi.cn/favicon.ico" // 外部图片链接
                            },
                            url: "https://api.ahfi.cn/"
                        },
                        {
                            name: "小轩API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.519689.xyz/"
                        },
                        {
                            name: "星空API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://cdn.71xk.com/xkstatic/common/images/logo/png_favicon.png" // 外部图片链接
                            },
                            url: "https://api.71xk.com/"
                        },
                        {
                            name: "零七生活API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.oick.cn/"
                        },
                        {
                            name: "ROLLAPI",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.mxnzp.com/doc/list"
                        },
                        {
                            name: "星云API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.xygalaxy.com/xyApi"
                        },
                        {
                            name: "洛樱云API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.alcex.cn/"
                        },
                        {
                            name: "WhyAPI",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://apis.whyta.cn/"
                        },
                        {
                            name: "绿夏API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.lxurl.net/images/202212251733346714.png" // 外部图片链接
                            },
                            url: "https://api.lxurl.net/"
                        },
                        {
                            name: "科技言API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.soword.cn/storage/logo/20230321/c2524c4da6fd469259b0de4478b3a85d.png" // 外部图片链接
                            },
                            url: "https://www.soword.cn/api"
                        },
                        {
                            name: "冷言API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://qqlykm.cn/type/3"
                        },
                        {
                            name: "ALAPI",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.alapi.cn/"
                        },
                        {
                            name: "惜染图库API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.hefollo.cn/"
                        },
                        {
                            name: "江江API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://x4f5rt.site/"
                        },
                        {
                            name: "客源API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.qster.top/favicon.ico" // 外部图片链接
                            },
                            url: "https://api.qster.top/API/"
                        },
                        {
                            name: "诉说API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://api.bi71t5.cn/"
                        },
                        {
                            name: "夏枫API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://qqbyh.cn/"
                        },
                        {
                            name: "枫雨API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api-v2.yuafeng.cn/"
                        },
                        {
                            name: "晴天API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://sbtxqq.com/"
                        },
                        {
                            name: "看戏仔API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.kxzjoker.cn/"
                        },
                        {
                            name: "福利云API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://free.xwteam.cn/assets/img/FreeAPI.png" // 外部图片链接
                            },
                            url: "https://free.xwteam.cn/"
                        },
                        {
                            name: "SHWG API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.shwgij.com/assets/img/favicon.png" // 外部图片链接
                            },
                            url: "https://api.shwgij.com/"
                        },
                        {
                            name: "栗次元API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://t.alcy.cc/"
                        },
                        {
                            name: "筱初API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.xcboke.cn/"
                        },
                        {
                            name: "安生API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "http://api.1668888.xyz/assets/img/favicons/favicon.png" // 外部图片链接
                            },
                            url: "http://api.1668888.xyz/"
                        },
                        {
                            name: "飞飞API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "http://api.ulq.cc/favicon.ico" // 外部图片链接
                            },
                            url: "http://api.ulq.cc/"
                        },
                        {
                            name: "云汐API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://a.aa.cab/"
                        },
                        {
                            name: "梦幻之都API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://xn--api-998d135eh4nqt0e.top/"
                        },
                        {
                            name: "思娟API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.xiaoluwu.com/Template/index/Neumorphism/assets/images/logo.png" // 外部图片链接
                            },
                            url: "https://api.xiaoluwu.com/"
                        },
                        {
                            name: "喵喵API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.niniandmiaomiao.love/"
                        },
                        {
                            name: "驼城API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.tcslw.cn/"
                        },
                        {
                            name: "清和API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.qhsou.com/"
                        },
                        {
                            name: "妙藏API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "http://api.tinise.cn/assets/img/favicons/favicon.png" // 外部图片链接
                            },
                            url: "http://api.tinise.cn/"
                        },
                        {
                            name: "骁拓API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.xiaotuo.net/favicon.ico" // 外部图片链接
                            },
                            url: "https://api.xiaotuo.net/"
                        },
                        {
                            name: "回望API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://api.xyeopx.cn/"
                        },
                        {
                            name: "星雨API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://xingyu.loveiu.cn/"
                        },
                        {
                            name: "小尘API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "http://api.xcvts.cn/favicon.ico" // 外部图片链接
                            },
                            url: "http://api.xcvts.cn/"
                        },
                        {
                            name: "小萝卜API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://api.lbbb.cc/assets/img/favicons/favicon.png" // 外部图片链接
                            },
                            url: "https://api.lbbb.cc/"
                        },
                        {
                            name: "雨冥API",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://api.yuxli.cn/"
                        },
                    ]
                }
            ]
        },
        {
            id: "featured",
            name: "特色导航",
            icon: "fas fa-fire",
            subcategories: [
                {
                    id: "hot",
                    name: "热门",
                    sites: [
                        {
                            name: "黑洞导航",
                            description: "当前最受欢迎的资源",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 本地图片路径
                            },
                            url: "https://hddh.link/"
                        },
                        {
                            name: "薇飞导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.fwfly.com/zb_users/theme/suiranx_nav/image/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.fwfly.com/"
                        },
                        {
                            name: "柒夜导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://nav.qinight.com/static/image/favicon.ico" // 外部图片链接
                            },
                            url: "https://nav.qinight.com/"
                        },
                        {
                            name: "终极导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.zjnav.com/wp-content/uploads/2024/01/1705467656-favicon.png" // 外部图片链接
                            },
                            url: "https://www.zjnav.com/"
                        },
                        {
                            name: "药研导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://drugx.cn/wp-content/uploads/2021/12/Drugx-cn.ico" // 外部图片链接
                            },
                            url: "https://drugx.cn/"
                        },
                        {
                            name: "不死鸟",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://dalao.ru/"
                        },
                        {
                            name: "不求人导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://tools.bqrdh.com/static/images/favicon_fox.png" // 外部图片链接
                            },
                            url: "https://www.bqrdh.com/"
                        },
                        {
                            name: "阿酷导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.a.cool/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.a.cool/"
                        },
                        {
                            name: "快导航网",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.hifast.cn/wp-content/uploads/2022/02/hifast.png" // 外部图片链接
                            },
                            url: "https://www.hifast.cn/"
                        },
                        {
                            name: "嘀哩嘀哩导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://dlidli.wang/wp-content/uploads/2020/09/favicon.png" // 外部图片链接
                            },
                            url: "https://dlidli.wang/"
                        },
                        {
                            name: "好资源导航网",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.haoziyuan.cc/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.haoziyuan.cc/"
                        },
                        {
                            name: "迷鹿导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.plnav.com/static/images/favicon.png" // 外部图片链接
                            },
                            url: "https://www.plnav.com/"
                        },
                        {
                            name: "赛克导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://sec123.cn/index/cropped-logo-2.webp" // 外部图片链接
                            },
                            url: "https://sec123.cn/"
                        },
                        {
                            name: "en导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.enabcd.cn/logo.png" // 外部图片链接
                            },
                            url: "https://www.enabcd.cn/"
                        },
                        {
                            name: "一糖导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://iitang.com/wp-content/uploads/2024/10/1729737698-%E8%B5%84%E6%BA%90-2.png" // 外部图片链接
                            },
                            url: "https://iitang.com/"
                        },
                        {
                            name: "voidke导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://tools.voidke.com/wp-content/uploads/2024/07/1720006317-favicon.ico" // 外部图片链接
                            },
                            url: "https://tools.voidke.com/"
                        },
                        {
                            name: "XXV网址导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.xxv.cn/"
                        },
                        {
                            name: "JAY的资源库",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.lovejay.top/wp-content/uploads/2023/08/80.png" // 外部图片链接
                            },
                            url: "https://www.lovejay.top/"
                        },
                        {
                            name: "开发者导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://codernav.com/favicon.png" // 外部图片链接
                            },
                            url: "https://codernav.com/"
                        },
                        {
                            name: "深度导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.deepdh.com/wp-content/uploads/bg/favicon.png" // 外部图片链接
                            },
                            url: "https://www.deepdh.com/"
                        },
                        {
                            name: "官网大全",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://guanwangdaquan.com/"
                        },
                        {
                            name: "无峰网址导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.8kmm.com/img/logo_200.png" // 外部图片链接
                            },
                            url: "https://www.8kmm.com/"
                        },
                        {
                            name: "酷啦鱼",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.kulayu.com/wp-content/uploads/2024/06/1718912557-favicon.png" // 外部图片链接
                            },
                            url: "https://www.kulayu.com/"
                        },
                        {
                            name: "爱达杂货铺",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://adzhp.cc/wp-content/uploads/2020/02/A-win.ico" // 外部图片链接
                            },
                            url: "https://adzhp.cc/"
                        },
                        {
                            name: "果汁导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "http://www.guozhivip.com/images/ic.ico" // 外部图片链接
                            },
                            url: "http://www.guozhivip.com/"
                        },
                        {
                            name: "数字素养网",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://szsyw.cn/wp-content/uploads/2025/04/1745759673-60f17011e80d2.png" // 外部图片链接
                            },
                            url: "https://szsyw.cn/"
                        },
                        {
                            name: "一只会飞的旺旺",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://nav.wangwangit.com/"
                        },
                        {
                            name: "Noisedh导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://www.noisedh.cn/"
                        },
                        {
                            name: "趣导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www-qssily-com.oss-cn-shenzhen.aliyuncs.com/img/7nxp.png" // 外部图片链接
                            },
                            url: "https://qssily.com/"
                        },
                        {
                            name: "喜欢书签",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.likebookmark.com/#category-229"
                        },
                        {
                            name: "书签地球",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.bookmarkearth.cn/media/img/logo/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.bookmarkearth.cn/"
                        },
                        {
                            name: "聚神铺导航",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.jspoo.com/wp-content/themes/onenav/screenshot.jpg" // 外部图片链接
                            },
                            url: "https://www.jspoo.com/"
                        },
                    ]
                },
                {
                    id: "learning",
                    name: "学习",
                    sites: [
                        {
                            name: "在线课程平台",
                            description: "提供各类专业课程",
                            icon: {
                                type: "text",
                                value: "🎓"
                            },
                            url: "https://example.com/online-courses"
                        },
                        {
                            name: "知识分享社区",
                            description: "专业人士交流平台",
                            icon: {
                                type: "text",
                                value: "💡"
                            },
                            url: "https://example.com/knowledge-sharing"
                        }
                    ]
                }
            ]
        },
        {
            id: "entertainment",
            name: "影音阅漫游",
            icon: "fas fa-film",
            subcategories: [
                {
                    id: "video",
                    name: "在线影视",
                    sites: [
                        {
                            name: "阳光影视",
                            description: "国内知名弹幕视频网站",
                            icon: {
                                type: "image",
                                value: "https://mengdm.vip/upload/mxprocms/20250812-1/5d4d42d54bbb39e182fceac09487507c.jpg"
                            },
                            url: "https://mengdm.vip/"
                        },
                        {
                            name: "八号影视",
                            description: "全球最大的视频分享平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png"
                            },
                            url: "https://www.bahaotv.com/"
                        },
                        {
                            name: "FreeOK",
                            description: "高品质视频娱乐服务",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png"
                            },
                            url: "https://www.freeok.mobi/"
                        },
                        {
                            name: "火车太堵",
                            description: "海量高清视频在线观看",
                            icon: {
                                type: "image",
                                value: "https://beijing2.xstore.qihu.com/aiwork-feedback-meida/9294720ede773efc7d798754ec1fdd3c-ca09d016-5177-4b4a-b0e2-c711f1c6369e.png"
                            },
                            url: "https://www.hctd1.com/"
                        },
                        {
                            name: "哒哒影漫",
                            description: "中国领先视频平台",
                            icon: {
                                type: "image",
                                value: "https://oss.dddym.com/code/1.0.25/image/favicon.svg"
                            },
                            url: "https://www.dddym.com/"
                        },
                        {
                            name: "游子影视",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.youzisp.tv/"
                        },
                        {
                            name: "观影GYING",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.gying.net/user/login"
                        },
                        {
                            name: "毒舌电影",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.dushe7.app/"
                        },
                        {
                            name: "来看点播",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://lkvod.org/upload/site/20241223-1/eb0f19bab937f4f3da69d1fa2b7c516c.png" // 外部图片链接
                            },
                            url: "https://lkvod.org/"
                        },
                        {
                            name: "哈哩哈哩",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://halihali21.com/"
                        },
                        {
                            name: "臭蛋蛋影视",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://cddys.me/wp-content/uploads/2023/09/icon-1.png" // 外部图片链接
                            },
                            url: "https://cddys.me/"
                        },
                        {
                            name: "片吧影视",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.pbpbs.com/"
                        },
                        {
                            name: "七味",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.qwavi.com/"
                        },
                        {
                            name: "剧爷爷",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.juyeye.cc/"
                        },
                        {
                            name: "LIBVIO",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.libvio.cc/statics/img/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.libvio.cc/"
                        },
                        {
                            name: "555电影",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://vpic.cms.qq.com/nj_vpic/3272248629/1738571699548996690/3635677961821188660" // 外部图片链接
                            },
                            url: "https://55u21.art/"
                        },
                        {
                            name: "FreeOK",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.freeok.la/mxtheme/images/favicon.png" // 外部图片链接
                            },
                            url: "https://www.freeok.la/"
                        },
                        {
                            name: "GAZE",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://gaze.run/"
                        },
                    ]
                },
                {
                    id: "movie",
                    name: "二次元",
                    sites: [
                        {
                            name: "樱花动漫",
                            description: "提供最新的电影介绍和评论",
                            icon: {
                                type: "image",
                                value: "https://www.zkk79.com/template/zkk7/statics/img/favicon.ico"
                            },
                            url: "https://www.zkk79.com/"
                        },
                        {
                            name: "NT动漫",
                            description: "互联网电影资料库",
                            icon: {
                                type: "image",
                                value: "https://cdn.yinghuazy.xyz/webjs/ntdm8/image/favicon.ico"
                            },
                            url: "https://www.ntdm8.com/"
                        },
                        {
                            name: "樱花动漫",
                            description: "电影资讯与票房数据",
                            icon: {
                                type: "image",
                                value: "http://m.iyinghua.com/js/20180601/ico.png"
                            },
                            url: "http://m.iyinghua.com/"
                        },
                        {
                            name: "烂番茄",
                            description: "美国影评网站",
                            icon: {
                                type: "image",
                                value: "https://www.rottentomatoes.com/favicon.ico"
                            },
                            url: "https://www.rottentomatoes.com/"
                        }
                    ]
                },
                {
                    id: "tv",
                    name: "影视资源",
                    sites: [
                        {
                            name: "电影高清迅雷下载",
                            description: "提供美剧等海外剧集资源",
                            icon: {
                                type: "image",
                                value: "https://xunlei8.org/static/img/favicon.png"
                            },
                            url: "https://xunlei8.org/"
                        },
                        {
                            name: "飘花资源网",
                            description: "最新韩剧资源",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png"
                            },
                            url: "https://www.piaohua.com/"
                        },
                        {
                            name: "美剧粉",
                            description: "热门美剧下载与在线观看",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png"
                            },
                            url: "https://www.mjf2020.com/"
                        },
                        {
                            name: "看片狂人",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://kuangren.us/portal.html"
                        },
                        {
                            name: "梦幻天堂",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.321n.net/"
                        },
                        {
                            name: "人人电源网",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.rrdynb.com/index.html"
                        },
                        {
                            name: "人人影视分享站",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://yyets.click/svg/logo.svg" // 外部图片链接
                            },
                            url: "https://yyets.click/home"
                        },
                        {
                            name: "美剧迷",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.meijumi.net/wp-content/themes/2016091704541775/images/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.meijumi.net/"
                        },
                        {
                            name: "吴签磁力",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://prod.b5.howcdn.com/img/wuqian/favicon.png" // 外部图片链接
                            },
                            url: "https://wuqiantv.top/"
                        },
                        {
                            name: "樱花动漫",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://yhdm33.com/static/img/favicon.png" // 外部图片链接
                            },
                            url: "https://yhdm33.com/"
                        },
                        {
                            name: "黑豆短剧",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.hddj.cc/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.hddj.cc/"
                        },
                        {
                            name: "热门网盘资源",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://docs.qq.com/sheet/DRnhoRHpoV2lodFlq?tab=km9qhm"
                        },
                    ]
                },
                {
                    id: "anime",
                    name: "字幕资源",
                    sites: [
                        {
                            name: "字幕库",
                            description: "中国第一家弹幕视频网站",
                            icon: {
                                type: "image",
                                value: "https://srtku.com/favicon.png"
                            },
                            url: "https://srtku.com/"
                        },
                        {
                            name: "SudHD",
                            description: "在线动漫观看平台",
                            icon: {
                                type: "image",
                                value: "https://img.subhd.tv/files/apple-touch-icon.png"
                            },
                            url: "https://subhd.tv/"
                        },
                        {
                            name: "巴哈姆特動畫瘋",
                            description: "台湾知名动画平台",
                            icon: {
                                type: "image",
                                value: "https://ani.gamer.com.tw/favicon.ico"
                            },
                            url: "https://ani.gamer.com.tw/"
                        }
                    ]
                },
                {
                    id: "variety",
                    name: "在线音乐",
                    sites: [
                        {
                            name: "微音",
                            description: "湖南卫视官方视频平台",
                            icon: {
                                type: "image",
                                value: "https://www.yinwe.com/favicon.ico"
                            },
                            url: "https://www.yinwe.com/"
                        },
                        {
                            name: "音乐序章",
                            description: "中国蓝官方平台",
                            icon: {
                                type: "image",
                                value: "https://cc.cdn.sx.cn/favicon.ico"
                            },
                            url: "https://www.yinyueke.net/m/"
                        },
                        {
                            name: "铜钟音乐官网",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://tonzhon.com/favicon.ico" // 外部图片链接
                            },
                            url: "https://tonzhon.com/"
                        },
                        {
                            name: "音乐魔石",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://yym4.com/img/favicon.png" // 外部图片链接
                            },
                            url: "https://yym4.com/"
                        },
                        {
                            name: "音乐库",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.yinyueku.cn/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.yinyueku.cn/"
                        },
                        {
                            name: "mmPlayer",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://netease-music.fe-mm.com/#/music/playlist"
                        },
                        {
                            name: "闪闪音乐网",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "http://www.33ve.com/favicon.ico" // 外部图片链接
                            },
                            url: "http://www.33ve.com/"
                        },
                    ]
                },
                {
                    id: "yyzy",
                    name: "音乐资源",
                    sites: [
                        {
                            name: "音乐解析器",
                            description: "湖南卫视官方视频平台",
                            icon: {
                                type: "image",
                                value: "https://musicjx.com/static/img/apple-touch-icon.png"
                            },
                            url: "https://musicjx.com/"
                        },
                        {
                            name: "无损生活",
                            description: "中国蓝官方平台",
                            icon: {
                                type: "image",
                                value: "https://flac.life/img/logo.png"
                            },
                            url: "https://flac.life/"
                        },
                        {
                            name: "MP3BST",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://example.com/icon.png" // 外部图片链接
                            },
                            url: "https://docs.qq.com/doc/DTVVqdEVuVWhReU1l"
                        },
                        {
                            name: "歌曲宝",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.gequbao.com/static/img/logo.png" // 外部图片链接
                            },
                            url: "https://www.gequbao.com/"
                        },
                        {
                            name: "趣乐兔",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://funletu.com/music/favicon.ico" // 外部图片链接
                            },
                            url: "https://funletu.com/music/"
                        },
                        {
                            name: "52ape",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.52ape.com/img/4377a791184e1e59f1afa67a77050a69" // 外部图片链接
                            },
                            url: "http://www.52ape.com/"
                        },
                    ]
                },
                {
                    id: "ydzy",
                    name: "阅读资源",
                    sites: [
                        {
                            name: "鸠摩搜索",
                            description: "湖南卫视官方视频平台",
                            icon: {
                                type: "image",
                                value: "https://www.jiumodiary.com/images/apple/apple-114.png"
                            },
                            url: "https://www.jiumodiary.com/"
                        },
                        {
                            name: "找书神器",
                            description: "中国蓝官方平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png"
                            },
                            url: "https://mianfei22.com/v3_uni_0919213?2"
                        },
                        {
                            name: "贼吧网",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://m.zei8.vip/"
                        },
                        {
                            name: "乐文小说网",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.lewen6.com/yanqing/book.jpg" // 外部图片链接
                            },
                            url: "https://www.lewen6.com/"
                        },
                        {
                            name: "知轩藏书",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://zxcs.info/"
                        },
                        {
                            name: "搬书匠",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://www.banshujiang.cn/"
                        },
                        {
                            name: "书格",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.shuge.org/wp-content/uploads/2018/06/shugeorg-icon.png" // 外部图片链接
                            },
                            url: "https://www.shuge.org/"
                        },
                        {
                            name: "苦瓜书盘",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.kgbook.com/"
                        },
                        {
                            name: "资源帝",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://shu.ziyuandi.cn/"
                        },
                        {
                            name: "香书小说",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "http://www.xbiqugu.la/files/article/image/134/134375/134375s.jpg" // 外部图片链接
                            },
                            url: "http://wap.xbiqugu.la/"
                        },
                        {
                            name: "爱下电子书",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://ixdzs8.com/images/favicon.ico" // 外部图片链接
                            },
                            url: "https://ixdzs8.com/"
                        },
                        {
                            name: "效率集",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://files.xiaolvji.com/img/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.xiaolvji.com/u/ljyandlwl"
                        },
                        {
                            name: "熊猫搜索",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://xmsoushu.com/favicon.ico" // 外部图片链接
                            },
                            url: "https://xmsoushu.com/#/result"
                        },
                        {
                            name: "阅读链",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.yuedu.pro/wp-content/uploads/2024/11/LOGO-3.0-400-300x300.png" // 外部图片链接
                            },
                            url: "https://www.yuedu.pro/"
                        },
                        {
                            name: "电子书搜索",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.giffox.com/favicon.png" // 外部图片链接
                            },
                            url: "https://www.giffox.com/?ref=www.tboxn.com"
                        },
                        {
                            name: "阅读",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://read.ygxz.in/#/"
                        },
                    ]
                },

                {
                    id: "zxhm",
                    name: "漫画资源",
                    sites: [
                        {
                            name: "漫画屋",
                            description: "湖南卫视官方视频平台",
                            icon: {
                                type: "image",
                                value: "https://www.mhua5.com/template/wap/default/img/favicon.ico"
                            },
                            url: "https://www.mhua5.com/"
                        },
                        {
                            name: "包子漫画",
                            description: "中国蓝官方平台",
                            icon: {
                                type: "image",
                                value: "https://static-tw.baozimhcn.com/static/bzmh/img/apple-icon-57x57.png"
                            },
                            url: "https://cn.baozimhcn.com/"
                        },
                        {
                            name: "COLAMANGA",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.colamanga.com/static/logo.png" // 外部图片链接
                            },
                            url: "https://www.colamanga.com/show?orderBy=update"
                        },
                        
                    ]
                },


            ]
        },       
// 在data.js的navigationData.categories数组中添加游戏娱乐分类
// 将其放在影音阅漫分类之后
{
    id: "games",
    name: "游戏娱乐",
    icon: "fas fa-gamepad",
    subcategories: [
                {
                    id: "zxyx",
                    name: "在线游戏",
                    sites: [
                        {
                            name: "小霸王",
                            description: "湖南卫视官方视频平台",
                            icon: {
                                type: "image",
                                value: "https://img.1990i.com/f.png"
                            },
                            url: "https://www.yikm.net/"
                        },
                        {
                            name: "桌游合集",
                            description: "中国蓝官方平台",
                            icon: {
                                type: "image",
                                value: "https://fe-1255520126.file.myqcloud.com/game/logo192-ed8a0a.png"
                            },
                            url: "https://game.hullqin.cn/?ref=www.tboxn.com"
                        },
                        {
                            name: "中国省级行政区划",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://vultr.youmu.moe/quiz/favicon.ico" // 外部图片链接
                            },
                            url: "https://vultr.youmu.moe/quiz/?ref=www.tboxn.com"
                        },
                        {
                            name: "人生重开模拟器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://liferestart.syaro.io/public/index.html?ref=www.tboxn.com"
                        },
                        {
                            name: "神奇海螺试验场",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://lab.magiconch.com/"
                        },
                        {
                            name: "柠檬精",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://lemonjing.com/apple-touch-icon.png" // 外部图片链接
                            },
                            url: "https://lemonjing.com/?ref=www.tboxn.com"
                        },
                        {
                            name: "在线节奏",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://bemuse.ninja/res/icon.png" // 外部图片链接
                            },
                            url: "https://bemuse.ninja/"
                        },
                        {
                            name: "果汁实验室",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "http://guozhivip.com/lab/images/logo.png" // 外部图片链接
                            },
                            url: "http://guozhivip.com/lab/"
                        },
                        {
                            name: "俄罗斯方块",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "http://github.tanchangwen.com/react-tetris/?lan=zh-cn"
                        },
                        {
                            name: "在线魔方",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://iamthecu.be/media/cubeExplorer-favicon-0144x0144.png" // 外部图片链接
                            },
                            url: "https://iamthecu.be/"
                        },
                        {
                            name: "老游戏在线玩",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://zaixianwan.app/apple-touch-icon.png" // 外部图片链接
                            },
                            url: "https://zaixianwan.app/"
                        },
                        {
                            name: "核心防御",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://lab.hakim.se/core/"
                        },
                        {
                            name: "井字游戏",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://playtictactoe.org/assets/images/icon-800.png" // 外部图片链接
                            },
                            url: "https://playtictactoe.org/"
                        },
                        {
                            name: "画物理线条",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.xiwnn.com/huaxian"
                        },
                        {
                            name: "mk48",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://mk48.io/favicon.png" // 外部图片链接
                            },
                            url: "https://mk48.io/"
                        },
                        {
                            name: "大脚车",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://drive-mad.cc/favicon.ico" // 外部图片链接
                            },
                            url: "https://drive-mad.cc/"
                        },
                        {
                            name: "信任的进化",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://dccxi.com/trust/favicon.png" // 外部图片链接
                            },
                            url: "https://dccxi.com/trust/"
                        },
                        {
                            name: "3D玩具车",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://bruno-simon.com/favicon/favicon-32x32.png" // 外部图片链接
                            },
                            url: "https://bruno-simon.com/"
                        },
                        {
                            name: "六边形消消乐",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://srvcn.xbext.com/h5games/hextris/favicon.ico" // 外部图片链接
                            },
                            url: "https://srvcn.xbext.com/h5games/hextris/"
                        },
                        {
                            name: "找色差",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.zhaosecha.com/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.zhaosecha.com/"
                        },
                    ]
                },
                {
                    id: "yxzy",
                    name: "游戏资源",
                    sites: [
                        {
                            name: "千寻科技",
                            description: "湖南卫视官方视频平台",
                            icon: {
                                type: "image",
                                value: "https://link3.cc/favicon.ico"
                            },
                            url: "https://link3.cc/ctv6666"
                        },
                        {
                            name: "小黑辅助网",
                            description: "中国蓝官方平台",
                            icon: {
                                type: "image",
                                value: "https://www.xhfby.com/favicon.ico"
                            },
                            url: "https://www.xhfby.com/"
                        },
                        {
                            name: "辅助吧",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.fuzhuba.org/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.fuzhuba.org/"
                        },
                        {
                            name: "皮皮资源网",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.pipizyw.com/content/uploadfile/tpl_options//logo.png" // 外部图片链接
                            },
                            url: "https://www.pipizyw.com/"
                        },
                        {
                            name: "小黑盒",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.xiaoheihe.cn/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.xiaoheihe.cn/tools/invite_friend/share?heybox_id=46868204"
                        },
                    ]
                },
                {
                    id: "scq",
                    name: "生成器",
                    sites: [
                        {
                            name: "草料二维码",
                            description: "湖南卫视官方视频平台",
                            icon: {
                                type: "image",
                                value: "https://gstatic.clewm.net/caoliao-resource/240407/6b2aef_89bd6906.png"
                            },
                            url: "https://cli.im/#"
                        },
                        {
                            name: "密码生成器",
                            description: "中国蓝官方平台",
                            icon: {
                                type: "image",
                                value: "https://tool.liumingye.cn/favicon.ico"
                            },
                            url: "https://tool.liumingye.cn/password/"
                        },
                        {
                            name: "朋友圈生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://akarin.dev/WechatMomentScreenshot/"
                        },
                        {
                            name: "AI二维码生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://qrbtf.com/assets/qrcodes/g1.jpg" // 外部图片链接
                            },
                            url: "https://qrbtf.com/zh"
                        },
                        {
                            name: "营销号生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://cpwebassets.codepen.io/assets/favicon/apple-touch-icon-5ae1a0698dcc2402e9712f7d01ed509a57814f994c660df9f7a952f3060705ee.png" // 外部图片链接
                            },
                            url: "https://codepen.io/kasei-dis/full/JjYjwza?__cf_chl_jschl_tk__"
                        },
                        {
                            name: "微信对话生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://wechat.sxcto.com/favicon.ico" // 外部图片链接
                            },
                            url: "https://wechat.sxcto.com/"
                        },
                        {
                            name: "微信集赞生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://itakeo.com/wx/logo.png?v=1" // 外部图片链接
                            },
                            url: "https://itakeo.com/wx/#homePage"
                        },
                        {
                            name: "装逼生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://c.tianhezulin.com/images/logo2.jpg" // 外部图片链接
                            },
                            url: "https://c.tianhezulin.com/"
                        },
                        {
                            name: "名称生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://lovable.dev/opengraph-image-p98pqg.png" // 外部图片链接
                            },
                            url: "https://www.randomgenerator.vip/"
                        },
                        {
                            name: "宝可梦生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.randompokemon.games/"
                        },
                        {
                            name: "彩虹屁生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://chp.shadiao.pro/_nuxt/icons/icon_64x64.6233e8.png" // 外部图片链接
                            },
                            url: "https://chp.shadiao.pro/"
                        },
                        {
                            name: "字幕截图生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://disksing.com/fake-screenshot/"
                        },
                        {
                            name: "手写文稿生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://cdnn.mmtool.cn/favicon.svg" // 外部图片链接
                            },
                            url: "https://vtool.pro/handwriting/index.html?ref=www.qssily.com"
                        },
                        {
                            name: "Photofunia",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://cdn.photofunia.com/icons/favicon.ico" // 外部图片链接
                            },
                            url: "https://m.photofunia.com/cn/categories/all_effects"
                        },
                        {
                            name: "电子印章生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://vtool.pro/seal/index.html"
                        },
                        {
                            name: "网名生成器",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://example.com/icon.png" // 外部图片链接
                            },
                            url: "https://www.qiwangming.com/"
                        },
                    ]
                },
                {
                    id: "dtzz",
                    name: "斗图表情包",
                    sites: [
                        {
                            name: "彩字秀",
                            description: "湖南卫视官方视频平台",
                            icon: {
                                type: "image",
                                value: "https://www.czxiu.com/favicon.ico"
                            },
                            url: "https://www.czxiu.com/"
                        },
                        {
                            name: "斗图吧",
                            description: "中国蓝官方平台",
                            icon: {
                                type: "image",
                                value: "https://m.doutub.com/favicon.ico"
                            },
                            url: "https://m.doutub.com/"
                        },
                        {
                            name: "斗了个图",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://www.dogetu.com/favicon.ico" // 外部图片链接
                            },
                            url: "https://www.dogetu.com/"
                        },
                        {
                            name: "皮蛋",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://pdan.com.cn/wp-content/uploads/2023/04/favicon.ico" // 外部图片链接
                            },
                            url: "https://pdan.com.cn/"
                        },
                        {
                            name: "去斗图",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.qudoutu.cn/"
                        },
                        {
                            name: "堆糖",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://c-ssl.dtstatic.com/uploads/icons/duitang_favicon.ico" // 外部图片链接
                            },
                            url: "https://m.duitang.com/blogs/tag/?name=%E6%96%97%E5%9B%BE%E5%90%A7"
                        },
                        {
                            name: "在线斗图制作",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "assets/images/icons/00.png" // 外部图片链接
                            },
                            url: "https://www.xueyidian.cn/demo/tools/biaoqingbao/"
                        },
                        {
                            name: "闪萌",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "http://www.weshineapp.com/_nuxt/img/logo.a2779cc.png" // 外部图片链接
                            },
                            url: "http://www.weshineapp.com/"
                        },
                        {
                            name: "emojimix",
                            description: "用户评分最高的平台",
                            icon: {
                                type: "image",
                                value: "https://tikolu.net/emojimix/icons/meowtle.png" // 外部图片链接
                            },
                            url: "https://tikolu.net/emojimix/%F0%9F%8D%89+%F0%9F%8E%A3"
                        },
                        
                    ]
                },
    ]
},         
          

// 1. 学习教育分类
{
    id: "education",
    name: "学习教育",
    icon: "fas fa-graduation-cap",
    subcategories: [
        {
            id: "online-courses",
            name: "在线课程",
            sites: [
                {
                    name: "中国大学MOOC",
                    description: "国家精品在线课程学习平台",
                    icon: {
                        type: "image",
                        value: "https://www.icourse163.org/favicon.ico"
                    },
                    url: "https://www.icourse163.org/"
                },
                {
                    name: "学堂在线",
                    description: "清华大学发起的在线教育平台",
                    icon: {
                        type: "image",
                        value: "https://www.xuetangx.com/favicon.ico"
                    },
                    url: "https://www.xuetangx.com/"
                },
                {
                    name: "Coursera",
                    description: "国际知名在线课程平台",
                    icon: {
                        type: "image",
                        value: "https://www.coursera.org/favicon.ico"
                    },
                    url: "https://www.coursera.org/"
                },
                {
                    name: "edX",
                    description: "哈佛和MIT合作的在线学习平台",
                    icon: {
                        type: "image",
                        value: "https://www.edx.org/favicon.ico"
                    },
                    url: "https://www.edx.org/"
                },
                {
                    name: "网易公开课",
                    description: "国内外名校公开课",
                    icon: {
                        type: "image",
                        value: "https://open.163.com/favicon.ico"
                    },
                    url: "https://open.163.com/"
                }
            ]
        },
        {
            id: "language-learning",
            name: "语言学习",
            sites: [
                {
                    name: "多邻国",
                    description: "免费语言学习应用",
                    icon: {
                        type: "image",
                        value: "https://www.duolingo.com/favicon.ico"
                    },
                    url: "https://www.duolingo.com/"
                },
                {
                    name: "沪江网校",
                    description: "多语种在线学习平台",
                    icon: {
                        type: "image",
                        value: "https://www.hujiang.com/favicon.ico"
                    },
                    url: "https://www.hujiang.com/"
                },
                {
                    name: "扇贝单词",
                    description: "英语单词记忆工具",
                    icon: {
                        type: "image",
                        value: "https://www.shanbay.com/favicon.ico"
                    },
                    url: "https://www.shanbay.com/"
                },
                {
                    name: "BBC Learning English",
                    description: "BBC英语学习资源",
                    icon: {
                        type: "image",
                        value: "https://www.bbc.co.uk/learningenglish/favicon.ico"
                    },
                    url: "https://www.bbc.co.uk/learningenglish/"
                }
            ]
        },
        {
            id: "exam-prep",
            name: "考试备考",
            sites: [
                {
                    name: "中公教育",
                    description: "公务员考试培训",
                    icon: {
                        type: "image",
                        value: "https://www.offcn.com/favicon.ico"
                    },
                    url: "https://www.offcn.com/"
                },
                {
                    name: "华图教育",
                    description: "公职考试培训",
                    icon: {
                        type: "image",
                        value: "https://www.huatu.com/favicon.ico"
                    },
                    url: "https://www.huatu.com/"
                },
                {
                    name: "新东方在线",
                    description: "各类考试培训",
                    icon: {
                        type: "image",
                        value: "https://www.koolearn.com/favicon.ico"
                    },
                    url: "https://www.koolearn.com/"
                },
                {
                    name: "考研帮",
                    description: "考研资讯与辅导",
                    icon: {
                        type: "image",
                        value: "https://www.kaoyan.com/favicon.ico"
                    },
                    url: "https://www.kaoyan.com/"
                }
            ]
        },
        {
            id: "academic-resources",
            name: "学术资源",
            sites: [
                {
                    name: "中国知网",
                    description: "学术文献数据库",
                    icon: {
                        type: "image",
                        value: "https://www.cnki.net/favicon.ico"
                    },
                    url: "https://www.cnki.net/"
                },
                {
                    name: "万方数据",
                    description: "学术资源服务平台",
                    icon: {
                        type: "image",
                        value: "https://www.wanfangdata.com.cn/favicon.ico"
                    },
                    url: "https://www.wanfangdata.com.cn/"
                },
                {
                    name: "维普资讯",
                    description: "中文期刊服务平台",
                    icon: {
                        type: "image",
                        value: "https://www.cqvip.com/favicon.ico"
                    },
                    url: "https://www.cqvip.com/"
                },
                {
                    name: "百度学术",
                    description: "学术搜索服务平台",
                    icon: {
                        type: "image",
                        value: "https://xueshu.baidu.com/favicon.ico"
                    },
                    url: "https://xueshu.baidu.com/"
                }
            ]
        }
    ]
},

// 2. 应用市场分类
{
    id: "apps",
    name: "应用市场",
    icon: "fas fa-mobile-alt",
    subcategories: [
        {
            id: "android-stores",
            name: "安卓市场",
            sites: [
                {
                    name: "Google Play",
                    description: "谷歌官方应用商店",
                    icon: {
                        type: "image",
                        value: "https://play.google.com/favicon.ico"
                    },
                    url: "https://play.google.com/store"
                },
                {
                    name: "华为应用市场",
                    description: "华为官方应用商店",
                    icon: {
                        type: "image",
                        value: "https://appgallery.huawei.com/favicon.ico"
                    },
                    url: "https://appgallery.huawei.com/"
                },
                {
                    name: "小米应用商店",
                    description: "小米官方应用商店",
                    icon: {
                        type: "image",
                        value: "https://app.mi.com/favicon.ico"
                    },
                    url: "https://app.mi.com/"
                },
                {
                    name: "应用宝",
                    description: "腾讯应用商店",
                    icon: {
                        type: "image",
                        value: "https://sj.qq.com/favicon.ico"
                    },
                    url: "https://sj.qq.com/"
                },
                {
                    name: "酷安",
                    description: "安卓应用社区",
                    icon: {
                        type: "image",
                        value: "https://www.coolapk.com/favicon.ico"
                    },
                    url: "https://www.coolapk.com/"
                }
            ]
        },
        {
            id: "ios-stores",
            name: "iOS市场",
            sites: [
                {
                    name: "App Store",
                    description: "苹果官方应用商店",
                    icon: {
                        type: "image",
                        value: "https://www.apple.com/favicon.ico"
                    },
                    url: "https://www.apple.com/app-store/"
                },
                {
                    name: "TestFlight",
                    description: "苹果测试应用平台",
                    icon: {
                        type: "image",
                        value: "https://developer.apple.com/testflight/favicon.ico"
                    },
                    url: "https://developer.apple.com/testflight/"
                },
                {
                    name: "PP助手",
                    description: "iOS应用下载",
                    icon: {
                        type: "image",
                        value: "https://www.25pp.com/favicon.ico"
                    },
                    url: "https://www.25pp.com/"
                }
            ]
        },
        {
            id: "pc-software",
            name: "电脑软件",
            sites: [
                {
                    name: "腾讯软件中心",
                    description: "电脑软件下载",
                    icon: {
                        type: "image",
                        value: "https://pc.qq.com/favicon.ico"
                    },
                    url: "https://pc.qq.com/"
                },
                {
                    name: "360软件管家",
                    description: "安全软件下载",
                    icon: {
                        type: "image",
                        value: "https://soft.360.cn/favicon.ico"
                    },
                    url: "https://soft.360.cn/"
                },
                {
                    name: "SourceForge",
                    description: "开源软件平台",
                    icon: {
                        type: "image",
                        value: "https://sourceforge.net/favicon.ico"
                    },
                    url: "https://sourceforge.net/"
                },
                {
                    name: "GitHub",
                    description: "代码托管与开源项目",
                    icon: {
                        type: "image",
                        value: "https://github.com/favicon.ico"
                    },
                    url: "https://github.com/"
                }
            ]
        },
        {
            id: "app-reviews",
            name: "应用评测",
            sites: [
                {
                    name: "少数派",
                    description: "数字应用推荐与评测",
                    icon: {
                        type: "image",
                        value: "https://sspai.com/favicon.ico"
                    },
                    url: "https://sspai.com/"
                },
                {
                    name: "AppSo",
                    description: "应用推荐与技巧",
                    icon: {
                        type: "image",
                        value: "https://www.ifanr.com/favicon.ico"
                    },
                    url: "https://www.ifanr.com/app"
                },
                {
                    name: "Product Hunt",
                    description: "新产品发现平台",
                    icon: {
                        type: "image",
                        value: "https://www.producthunt.com/favicon.ico"
                    },
                    url: "https://www.producthunt.com/"
                }
            ]
        }
    ]
},

// 3. 趣味工具分类
{
    id: "tools",
    name: "趣味工具",
    icon: "fas fa-tools",
    subcategories: [
        {
            id: "online-tools",
            name: "在线工具",
            sites: [
                {
                    name: "Smallpdf",
                    description: "PDF在线处理工具",
                    icon: {
                        type: "image",
                        value: "https://smallpdf.com/favicon.ico"
                    },
                    url: "https://smallpdf.com/"
                },
                {
                    name: "Canva",
                    description: "在线设计工具",
                    icon: {
                        type: "image",
                        value: "https://www.canva.com/favicon.ico"
                    },
                    url: "https://www.canva.com/"
                },
                {
                    name: "Remove.bg",
                    description: "在线去除图片背景",
                    icon: {
                        type: "image",
                        value: "https://www.remove.bg/favicon.ico"
                    },
                    url: "https://www.remove.bg/"
                },
                {
                    name: "TinyPNG",
                    description: "图片压缩工具",
                    icon: {
                        type: "image",
                        value: "https://tinypng.com/favicon.ico"
                    },
                    url: "https://tinypng.com/"
                }
            ]
        },
        {
            id: "productivity",
            name: "效率工具",
            sites: [
                {
                    name: "Notion",
                    description: "一体化工作空间",
                    icon: {
                        type: "image",
                        value: "https://www.notion.so/favicon.ico"
                    },
                    url: "https://www.notion.so/"
                },
                {
                    name: "Trello",
                    description: "项目管理工具",
                    icon: {
                        type: "image",
                        value: "https://trello.com/favicon.ico"
                    },
                    url: "https://trello.com/"
                },
                {
                    name: "Evernote",
                    description: "笔记记录应用",
                    icon: {
                        type: "image",
                        value: "https://evernote.com/favicon.ico"
                    },
                    url: "https://evernote.com/"
                },
                {
                    name: "滴答清单",
                    description: "任务管理工具",
                    icon: {
                        type: "image",
                        value: "https://dida365.com/favicon.ico"
                    },
                    url: "https://dida365.com/"
                }
            ]
        },
        {
            id: "creative-tools",
            name: "创意工具",
            sites: [
                {
                    name: "Figma",
                    description: "在线设计协作工具",
                    icon: {
                        type: "image",
                        value: "https://www.figma.com/favicon.ico"
                    },
                    url: "https://www.figma.com/"
                },
                {
                    name: "CodePen",
                    description: "前端代码在线演示",
                    icon: {
                        type: "image",
                        value: "https://codepen.io/favicon.ico"
                    },
                    url: "https://codepen.io/"
                },
                {
                    name: "JSFiddle",
                    description: "在线代码测试工具",
                    icon: {
                        type: "image",
                        value: "https://jsfiddle.net/favicon.ico"
                    },
                    url: "https://jsfiddle.net/"
                },
                {
                    name: "Awwwards",
                    description: "网页设计灵感",
                    icon: {
                        type: "image",
                        value: "https://www.awwwards.com/favicon.ico"
                    },
                    url: "https://www.awwwards.com/"
                }
            ]
        },
        {
            id: "fun-websites",
            name: "趣味网站",
            sites: [
                {
                    name: "This Is Sand",
                    description: "在线沙画创作",
                    icon: {
                        type: "image",
                        value: "https://thisissand.com/favicon.ico"
                    },
                    url: "https://thisissand.com/"
                },
                {
                    name: "Silk",
                    description: "互动生成艺术",
                    icon: {
                        type: "image",
                        value: "http://weavesilk.com/favicon.ico"
                    },
                    url: "http://weavesilk.com/"
                },
                {
                    name: "Patatap",
                    description: "键盘音乐互动",
                    icon: {
                        type: "image",
                        value: "https://patatap.com/favicon.ico"
                    },
                    url: "https://patatap.com/"
                },
                {
                    name: "Little Alchemy",
                    description: "元素合成游戏",
                    icon: {
                        type: "image",
                        value: "https://littlealchemy.com/favicon.ico"
                    },
                    url: "https://littlealchemy.com/"
                }
            ]
        }
    ]
},

// 4. 日常生活分类
{
    id: "life",
    name: "日常生活",
    icon: "fas fa-utensils",
    subcategories: [
        {
            id: "shopping",
            name: "购物消费",
            sites: [
                {
                    name: "淘宝",
                    description: "综合性网购平台",
                    icon: {
                        type: "image",
                        value: "https://www.taobao.com/favicon.ico"
                    },
                    url: "https://www.taobao.com/"
                },
                {
                    name: "京东",
                    description: "自营电商平台",
                    icon: {
                        type: "image",
                        value: "https://www.jd.com/favicon.ico"
                    },
                    url: "https://www.jd.com/"
                },
                {
                    name: "拼多多",
                    description: "社交电商平台",
                    icon: {
                        type: "image",
                        value: "https://www.pinduoduo.com/favicon.ico"
                    },
                    url: "https://www.pinduoduo.com/"
                },
                {
                    name: "亚马逊",
                    description: "全球电商平台",
                    icon: {
                        type: "image",
                        value: "https://www.amazon.com/favicon.ico"
                    },
                    url: "https://www.amazon.com/"
                },
                {
                    name: "什么值得买",
                    description: "购物推荐平台",
                    icon: {
                        type: "image",
                        value: "https://www.smzdm.com/favicon.ico"
                    },
                    url: "https://www.smzdm.com/"
                }
            ]
        },
        {
            id: "food-delivery",
            name: "外卖美食",
            sites: [
                {
                    name: "美团外卖",
                    description: "外卖配送平台",
                    icon: {
                        type: "image",
                        value: "https://www.meituan.com/favicon.ico"
                    },
                    url: "https://www.meituan.com/"
                },
                {
                    name: "饿了么",
                    description: "在线外卖平台",
                    icon: {
                        type: "image",
                        value: "https://www.ele.me/favicon.ico"
                    },
                    url: "https://www.ele.me/"
                },
                {
                    name: "下厨房",
                    description: "美食菜谱分享",
                    icon: {
                        type: "image",
                        value: "https://www.xiachufang.com/favicon.ico"
                    },
                    url: "https://www.xiachufang.com/"
                },
                {
                    name: "豆果美食",
                    description: "食谱与美食社区",
                    icon: {
                        type: "image",
                        value: "https://www.douguo.com/favicon.ico"
                    },
                    url: "https://www.douguo.com/"
                }
            ]
        },
        {
            id: "travel",
            name: "旅行出行",
            sites: [
                {
                    name: "携程旅行",
                    description: "在线旅行服务",
                    icon: {
                        type: "image",
                        value: "https://www.ctrip.com/favicon.ico"
                    },
                    url: "https://www.ctrip.com/"
                },
                {
                    name: "飞猪",
                    description: "阿里旗下旅行平台",
                    icon: {
                        type: "image",
                        value: "https://www.fliggy.com/favicon.ico"
                    },
                    url: "https://www.fliggy.com/"
                },
                {
                    name: "马蜂窝",
                    description: "旅游攻略社区",
                    icon: {
                        type: "image",
                        value: "https://www.mafengwo.cn/favicon.ico"
                    },
                    url: "https://www.mafengwo.cn/"
                },
                {
                    name: "百度地图",
                    description: "地图导航服务",
                    icon: {
                        type: "image",
                        value: "https://map.baidu.com/favicon.ico"
                    },
                    url: "https://map.baidu.com/"
                },
                {
                    name: "高德地图",
                    description: "导航与地理位置服务",
                    icon: {
                        type: "image",
                        value: "https://www.amap.com/favicon.ico"
                    },
                    url: "https://www.amap.com/"
                }
            ]
        },
        {
            id: "health-life",
            name: "健康生活",
            sites: [
                {
                    name: "Keep",
                    description: "运动健身应用",
                    icon: {
                        type: "image",
                        value: "https://www.gotokeep.com/favicon.ico"
                    },
                    url: "https://www.gotokeep.com/"
                },
                {
                    name: "薄荷健康",
                    description: "健康管理平台",
                    icon: {
                        type: "image",
                        value: "https://www.boohee.com/favicon.ico"
                    },
                    url: "https://www.boohee.com/"
                },
                {
                    name: "丁香医生",
                    description: "医疗健康服务平台",
                    icon: {
                        type: "image",
                        value: "https://dxy.com/favicon.ico"
                    },
                    url: "https://dxy.com/"
                },
                {
                    name: "春雨医生",
                    description: "在线医疗咨询",
                    icon: {
                        type: "image",
                        value: "https://www.chunyuyisheng.com/favicon.ico"
                    },
                    url: "https://www.chunyuyisheng.com/"
                }
            ]
        }
    ]
}           
            
             
              
               
                
                 
                  
                    // 其他分类...
    ]
};