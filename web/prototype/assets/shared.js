window.CampusProto = (() => {
  const image = (id, params = "auto=format&fit=crop&w=900&q=85") => `https://images.unsplash.com/${id}?${params}`;

  const tabItems = [
    { id: "home", label: "资讯", icon: "solar:home-smile-bold-duotone", href: "home.html" },
    { id: "activity", label: "活动", icon: "solar:calendar-mark-bold-duotone", href: "activity.html" },
    { id: "study", label: "学习", icon: "solar:book-bookmark-bold-duotone", href: "study.html" },
    { id: "profile", label: "我的", icon: "solar:user-rounded-bold-duotone", href: "profile.html" },
  ];

  const news = [
    {
      title: "校团委发布五月主题团日活动指引",
      tag: "团日活动",
      time: "08:30",
      image: image("photo-1523050854058-8df90110c9f1"),
      summary: "围绕青春担当、志愿服务和基层实践开展班团联动。",
      hot: true,
    },
    {
      title: "青年志愿者服务月优秀项目展播",
      tag: "志愿服务",
      time: "昨天",
      image: image("photo-1521737604893-d14cc237f11d"),
      summary: "12 个院系项目入选，累计服务时长超过 3200 小时。",
      hot: false,
    },
    {
      title: "学生社团精品活动开放报名",
      tag: "校园文化",
      time: "周三",
      image: image("photo-1517486808906-6ca8b3f04846"),
      summary: "音乐、辩论、科创与公益四类活动同步开放报名。",
      hot: false,
    },
  ];

  const activities = [
    {
      title: "2024 迎新季志愿服务",
      campus: "明德广场",
      date: "6月03日 08:30",
      quota: 78,
      signed: 56,
      points: 12,
      image: image("photo-1517048676732-d65bc937f952"),
      tags: ["迎新", "志愿", "可加分"],
    },
    {
      title: "社区青春行动 - 智慧助老课堂",
      campus: "海淀街道服务站",
      date: "6月08日 14:00",
      quota: 40,
      signed: 31,
      points: 16,
      image: image("photo-1556761175-b413da4baf72"),
      tags: ["社区", "实践"],
    },
    {
      title: "校园低碳骑行倡议日",
      campus: "东区操场",
      date: "6月12日 16:00",
      quota: 120,
      signed: 82,
      points: 8,
      image: image("photo-1509062522246-3755977927d7"),
      tags: ["低碳", "团建"],
    },
  ];

  const lessons = [
    {
      title: "青年大学习第十二期",
      subtitle: "挺膺担当，在强国建设中贡献青春力量",
      progress: 82,
      due: "今晚 22:00 前完成",
      image: image("photo-1503676260728-1c00da094a0b"),
    },
    {
      title: "团章团史微课",
      subtitle: "从组织生活到基层实践的行动指南",
      progress: 46,
      due: "本周五截止",
      image: image("photo-1519389950473-47ba0277781c"),
    },
    {
      title: "安全教育专题学习",
      subtitle: "网络安全、宿舍安全与防诈骗案例",
      progress: 64,
      due: "还剩 3 天",
      image: image("photo-1516321318423-f06f85e504b3"),
    },
  ];

  const points = [
    { label: "志愿时长", value: "48h", icon: "solar:heart-angle-bold-duotone", tone: "from-rose-400 to-orange-400" },
    { label: "学习积分", value: "1360", icon: "solar:cup-star-bold-duotone", tone: "from-blue-500 to-cyan-400" },
    { label: "活动报名", value: "9", icon: "solar:ticket-sale-bold-duotone", tone: "from-emerald-400 to-teal-400" },
  ];

  const tasks = [
    { text: "完成青年大学习第十二期", state: "进行中", icon: "solar:play-circle-bold-duotone" },
    { text: "确认迎新志愿服务签到点", state: "待确认", icon: "solar:map-point-wave-bold-duotone" },
    { text: "提交五月主题团日活动反馈", state: "已完成", icon: "solar:check-circle-bold-duotone" },
  ];

  function nowTime() {
    return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  }

  function setupInteractions(root = document) {
    root.addEventListener("pointerdown", (event) => {
      const target = event.target.closest(".ripple");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const dot = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      dot.className = "ripple-dot";
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.left = `${event.clientX - rect.left}px`;
      dot.style.top = `${event.clientY - rect.top}px`;
      target.appendChild(dot);
      window.setTimeout(() => dot.remove(), 650);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("in-view");
      });
    }, { threshold: 0.12 });

    root.querySelectorAll(".reveal").forEach((item, index) => {
      item.style.setProperty("--delay", `${Math.min(index * 70, 360)}ms`);
      observer.observe(item);
    });
  }

  function createAppShell(active) {
    return {
      tabItems,
      active,
      now: nowTime(),
      setupInteractions,
    };
  }

  return {
    tabItems,
    news,
    activities,
    lessons,
    points,
    tasks,
    nowTime,
    setupInteractions,
    createAppShell,
  };
})();

