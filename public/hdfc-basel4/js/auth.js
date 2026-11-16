/* HDFC BANK · AUTHENTICATION & 2-STEP OTP FORGOT PASSWORD CONTROLLER */
(function (global) {
  const S = global.HDFCStore;
  let pendingOtp = null;
  let pendingResetUserId = null;

  function hydrateLandingSnapshot() {
    const data = S.getData();
    const m = S.computeBaselMetrics(data);
    const openBreaks = data.exceptions.filter(e => e.status === "Open").length;
    const vaultCount = data.reports.filter(r => S.isSignedOffReport(r)).length;
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt("landDateSla", data.config.reportingDate + " · SLA " + data.config.slaCutoffIst);
    setTxt("landCrar", "CRAR " + S.fmtPct(m.crarPct));
    setTxt("landCet1", S.fmtPct(m.cet1Pct));
    setTxt("landLcr", S.fmtPct(m.lcrPct));
    setTxt("landRwa", S.fmtInr(m.bindingRwa));
    setTxt("landVault", vaultCount + " Reports");
    setTxt("landBreaks", openBreaks + " Open Breaks");
    setTxt("landTotalExp", "Total Bank Balance Sheet: " + S.fmtInr(m.totalExp));
  }

  function populateRoleSelect() {
    const sel = document.getElementById("regRole");
    if (!sel) return;
    sel.innerHTML = S.ROLES.map(r => `<option value="${r.id}">${r.title}</option>`).join("");
  }

  global.openAuth = function (tab) {
    document.getElementById("screen-landing").classList.add("hidden");
    document.getElementById("screen-auth").classList.remove("hidden");
    global.switchAuthTab(tab || "login");
    window.scrollTo(0, 0);
  };

  global.backToLanding = function () {
    document.getElementById("screen-auth").classList.add("hidden");
    document.getElementById("screen-landing").classList.remove("hidden");
    window.scrollTo(0, 0);
  };

  global.switchAuthTab = function (tab) {
    const tabs = { login: "formLogin", forgot: "formForgot", register: "formRegister", password: "formPassword" };
    const btns = { login: "tabBtnLogin", forgot: "tabBtnForgot", register: "tabBtnRegister", password: "tabBtnPassword" };
    Object.keys(tabs).forEach(k => {
      document.getElementById(tabs[k]).classList.toggle("hidden", k !== tab);
      document.getElementById(btns[k]).classList.toggle("active", k === tab);
    });
  };

  global.togglePwd = function (inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    const isPwd = inp.type === "password";
    inp.type = isPwd ? "text" : "password";
    if (btn) btn.textContent = isPwd ? "Hide" : "Show";
  };

  function showBox(elId, type, text) {
    const box = document.getElementById(elId);
    if (!box) return;
    box.className = "alert-box " + (type === "ok" ? "alert-ok" : "alert-red");
    box.textContent = text;
    box.classList.remove("hidden");
  }

  global.submitLogin = function (e) {
    e.preventDefault();
    const uid = (document.getElementById("loginUserId").value || "").trim();
    const pwd = document.getElementById("loginPassword").value || "";
    if (!uid || pwd.length < 6) {
      showBox("loginMsg", "err", "Enter a valid User ID / Email and password.");
      return;
    }
    const acc = S.getAccounts().find(
      a => a.userId.toLowerCase() === uid.toLowerCase() || a.email.toLowerCase() === uid.toLowerCase()
    );
    if (!acc || acc.password !== pwd) {
      showBox("loginMsg", "err", "Invalid credentials. Verify User ID/Email and password, or use Forgot Password.");
      return;
    }
    const roleDef = S.getRoleById(acc.roleId);
    const sess = {
      userId: acc.userId,
      fullName: acc.fullName,
      email: acc.email,
      department: acc.department,
      roleId: acc.roleId,
      roleTitle: roleDef.title,
      signedInAt: new Date().toISOString()
    };
    S.setSession(sess);
    S.appendAudit("Auth Sign-In", "Signed in as " + roleDef.title, acc.userId, acc.fullName, roleDef.title);
    window.location.href = "./workspace.html";
  };

  global.requestResetOtp = function (e) {
    e.preventDefault();
    const uid = (document.getElementById("fpUserId").value || "").trim().toLowerCase();
    const email = (document.getElementById("fpEmail").value || "").trim().toLowerCase();
    const acc = S.getAccounts().find(
      a => a.userId.toLowerCase() === uid && a.email.toLowerCase() === email
    );
    if (!acc) {
      pendingOtp = null;
      pendingResetUserId = null;
      document.getElementById("forgotStep2").classList.add("hidden");
      showBox("forgotMsg", "err", "User ID and Registered Official Email do not match an active HDFC Bank / RBI account.");
      return;
    }
    pendingOtp = String(Math.floor(100000 + Math.random() * 900000));
    pendingResetUserId = acc.userId;
    document.getElementById("forgotStep2").classList.remove("hidden");
    showBox("forgotMsg", "ok", "OTP sent to " + acc.email + ". Verification Code: " + pendingOtp + " (Enter below to reset password).");
  };

  global.confirmOtpReset = function (e) {
    e.preventDefault();
    const otp = (document.getElementById("fpOtp").value || "").trim();
    const np1 = document.getElementById("fpNewPwd").value || "";
    const np2 = document.getElementById("fpConfirmPwd").value || "";
    if (!pendingOtp || !pendingResetUserId || otp !== pendingOtp) {
      showBox("forgotMsg", "err", "Invalid 6-digit verification OTP.");
      return;
    }
    if (np1.length < 8) {
      showBox("forgotMsg", "err", "New password must be at least 8 characters.");
      return;
    }
    if (np1 !== np2) {
      showBox("forgotMsg", "err", "Passwords do not match.");
      return;
    }
    const list = S.getAccounts();
    const idx = list.findIndex(a => a.userId === pendingResetUserId);
    if (idx === -1) {
      showBox("forgotMsg", "err", "Account record not found.");
      return;
    }
    list[idx].password = np1;
    S.saveAccounts(list);
    S.appendAudit("Password Reset", "Password reset via 2-step OTP verification", list[idx].userId, list[idx].fullName, S.getRoleById(list[idx].roleId).title);
    pendingOtp = null;
    pendingResetUserId = null;
    document.getElementById("forgotStep1").reset();
    document.getElementById("forgotStep2").reset();
    document.getElementById("forgotStep2").classList.add("hidden");
    showBox("forgotMsg", "ok", "Password reset complete for " + list[idx].userId + ". You may now sign in.");
  };

  global.submitRegister = function (e) {
    e.preventDefault();
    const fullName = (document.getElementById("regName").value || "").trim();
    const userId = (document.getElementById("regUserId").value || "").trim().toUpperCase();
    const email = (document.getElementById("regEmail").value || "").trim().toLowerCase();
    const roleId = document.getElementById("regRole").value;
    const pwd = document.getElementById("regPwd").value || "";
    const pwd2 = document.getElementById("regPwd2").value || "";
    if (!fullName || !userId || !email) {
      showBox("regMsg", "err", "Complete all required stakeholder fields.");
      return;
    }
    if (pwd.length < 8 || pwd !== pwd2) {
      showBox("regMsg", "err", "Password must be at least 8 characters and match confirmation.");
      return;
    }
    const list = S.getAccounts();
    if (list.some(a => a.userId.toUpperCase() === userId || a.email.toLowerCase() === email)) {
      showBox("regMsg", "err", "User ID or Official Email is already registered.");
      return;
    }
    const roleDef = S.getRoleById(roleId);
    list.push({ userId, fullName, email, department: roleDef.department, roleId, password: pwd });
    S.saveAccounts(list);
    S.appendAudit("User Registration", "Registered stakeholder " + userId + " (" + roleDef.title + ")", userId, fullName, roleDef.title);
    document.getElementById("formRegister").reset();
    showBox("regMsg", "ok", "Account " + userId + " created with " + roleDef.title + " access. Switch to Sign In to log in.");
  };

  global.submitChangePwd = function (e) {
    e.preventDefault();
    const uid = (document.getElementById("cpUserId").value || "").trim().toLowerCase();
    const curr = document.getElementById("cpCurrent").value || "";
    const np1 = document.getElementById("cpNew").value || "";
    const np2 = document.getElementById("cpNew2").value || "";
    const list = S.getAccounts();
    const idx = list.findIndex(a => a.userId.toLowerCase() === uid);
    if (idx === -1 || list[idx].password !== curr) {
      showBox("pwdMsg", "err", "User ID or Current Password is incorrect.");
      return;
    }
    if (np1.length < 8 || np1 !== np2) {
      showBox("pwdMsg", "err", "New password must be at least 8 characters and match confirmation.");
      return;
    }
    list[idx].password = np1;
    S.saveAccounts(list);
    S.appendAudit("Password Update", "Password updated after current-password verification", list[idx].userId, list[idx].fullName, S.getRoleById(list[idx].roleId).title);
    document.getElementById("formPassword").reset();
    showBox("pwdMsg", "ok", "Password updated securely for " + list[idx].userId + ".");
  };

  document.addEventListener("DOMContentLoaded", function () {
    S.hydrateLogos();
    hydrateLandingSnapshot();
    populateRoleSelect();
    if (window.location.search.includes("auth=1")) {
      global.openAuth("login");
    }
  });
})(window);
