export function createAcademicApi(call) {
  return {
    getAcademicReport: () => call({ path: "/academic/report" }),
    getAcademicPlan: () => call({ path: "/academic/plan" }),
    listAcademicPlans: () => call({ path: "/academic/workbench/plans" }),
    saveAcademicPlan: (payload) => call({ path: "/academic/workbench/plans", method: "PUT", data: payload }),
    importAcademicPlans: (file, options = {}) => {
      const data = new FormData();
      data.append("file", file);
      data.append("dryRun", String(options.dryRun !== false));
      return call({ path: "/academic/workbench/plans/import", method: "POST", data });
    },
    saveAcademicProgress: (modules) => call({ path: "/academic/progress", method: "PUT", data: { modules } }),
    uploadTranscript: (meta) => call({ path: "/academic/transcript", method: "POST", data: { meta } }),
    listAcademicRisks: () => call({ path: "/workbench/academic/risks" }),
  };
}
