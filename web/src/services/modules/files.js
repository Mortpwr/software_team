export function createFilesApi(call, { apiPath, requestBlob, sessionRef }) {
  return {
    uploadFile: (file, business = "application") => {
      const data = new FormData();
      data.append("file", file);
      data.append("business", business);
      return call({ path: "/files/upload", method: "POST", data });
    },
    downloadFile: (file) => requestBlob({
      path: apiPath(file.url || `/files/${file.id}/download`),
      data: { name: file.name },
      session: sessionRef.value,
    }),
    downloadTemplate: (template) => requestBlob({
      path: `/templates/${template.id}/download`,
      data: { name: template.name },
      session: sessionRef.value,
    }),
  };
}
