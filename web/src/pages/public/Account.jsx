import React, { useEffect, useState } from "react";
import { useAuth } from "../../stores/auth";
import { getMe } from "../../api/users";

export default function AccountPage() {
  const { username: fromToken } = useAuth();
  const [username, setUsername] = useState(fromToken || "");
  const [loading, setLoading] = useState(true);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const me = await getMe();
        if (!stop && me?.username) setUsername(me.username);
      } catch {}
      if (!stop) setLoading(false);
    })();
    return () => { stop = true; };
  }, []);

  if (loading) return <div className="container section">Đang tải...</div>;

  return (
    <div className="container section">
      <h1 className="h1">Tài khoản của tôi</h1>

      <div className="card" style={{ maxWidth: 600 }}>
        <div className="card-body">
          <div className="form-row">
            <label>Tên đăng nhập</label>
            <input className="input" value={username} disabled readOnly />
          </div>
          <p className="text-sm text-muted">Thông tin sức khoẻ (chiều cao, cân nặng, ... ) sẽ bổ sung sau.</p>
        </div>
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
