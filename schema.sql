-- 群聊申请记录表
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qq TEXT NOT NULL,
    group_number TEXT NOT NULL,
    group_name TEXT,
    group_size TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending',  -- pending, approved, rejected
    admin_reply TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON applications(created_at);
CREATE INDEX IF NOT EXISTS idx_qq ON applications(qq);