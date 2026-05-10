/**
 * 与需求文档 4 级角色对齐的本地会话角色（首版学生端承载「学生 + 管理老师演示」）。
 * 三级协同管理者可在后续加 WORKBENCH_COORD 能力位。
 */
module.exports = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  LEADER: 'leader',
};

module.exports.LABEL = {
  student: '学生',
  teacher: '管理老师（演示）',
  leader: '学院领导（演示只读）',
};
