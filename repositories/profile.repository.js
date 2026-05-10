const db = require('../core/db');
const roles = require('../constants/roles');

function maskPhone(p) {
  if (!p || p.length < 7) return p || '';
  return `${p.slice(0, 3)}****${p.slice(-4)}`;
}

function maskIdCard(_cipher) {
  return '**************（服务端解密前仅示意）';
}

function listStudents() {
  const d = db.readDb();
  return d.students.map((s) => publicStudent(s, roles.TEACHER));
}

function findStudent(studentId) {
  const d = db.readDb();
  return d.students.find((s) => s.studentId === studentId) || null;
}

/**
 * @param {any} s
 * @param {string} viewerRole
 */
function publicStudent(s, viewerRole) {
  const base = {
    studentId: s.studentId,
    name: s.name,
    grade: s.grade,
    major: s.major,
    className: s.className,
    nation: s.nation,
    politicalStatus: s.politicalStatus,
    tutor: s.tutor,
    extension: s.extension || {},
  };
  if (viewerRole === roles.STUDENT) {
    return {
      ...base,
      phoneMasked: maskPhone(s.phone),
      hometown: null,
      idCard: null,
    };
  }
  if (viewerRole === roles.TEACHER) {
    return {
      ...base,
      phone: s.phone,
      phoneMasked: maskPhone(s.phone),
      hometown: s.hometown,
      idCardMasked: maskIdCard(s.idCardCipher),
    };
  }
  if (viewerRole === roles.LEADER) {
    return {
      ...base,
      phoneMasked: maskPhone(s.phone),
      hometown: s.hometown ? `${String(s.hometown).slice(0, 1)}**` : null,
      idCard: null,
    };
  }
  return { ...base };
}

function getMe({ studentId, role }) {
  const s = findStudent(studentId);
  if (!s) return null;
  return publicStudent(s, role || roles.STUDENT);
}

function getDefaultStudentId() {
  const d = db.readDb();
  const first = d.students[0];
  return (first && first.studentId) || '';
}

module.exports = {
  listStudents,
  findStudent,
  publicStudent,
  getMe,
  getDefaultStudentId,
};
