/**
 * 本地持久化主键（单仓库，便于课程演示一键重置与备份）。
 * 正式对接服务端后，这些 key 仅在 useMock=true 时生效。
 */
module.exports = {
  DB: 'ss_platform_db_v3',
  BOOTSTRAP_META: 'ss_platform_bootstrap_meta_v1',
};
