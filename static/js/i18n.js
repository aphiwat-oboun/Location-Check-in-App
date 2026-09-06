/**
 * Real-Time Bilingual (TH / EN) Language Engine
 * Supports instant in-place translation across all pages, dynamic components, modals, and tables.
 */

(function() {
  const TH_EN_MAP = [
    // Brand & Main Navigation
    ["ที่นี่มีอะไร?", "What's Here?"],
    ["หน้าหลัก", "Home"],
    ["แผนที่", "Map"],
    ["สำรวจ", "Explore"],
    ["สำรวจทั้งหมด", "Explore All"],
    ["ดูทั้งหมด", "View All"],
    ["เพิ่มสถานที่", "Create Post"],
    ["สร้างโพสต์", "Create Post"],
    ["โพสต์ใหม่", "New Post"],
    ["โพสต์ของฉัน", "My Posts"],
    ["บันทึกแล้ว", "Saved"],
    ["ที่บันทึกไว้", "Saved"],
    ["การแจ้งเตือน", "Notifications"],
    ["โปรไฟล์ของฉัน", "My Profile"],
    ["โปรไฟล์", "Profile"],
    ["ดูโปรไฟล์", "View Profile"],
    ["เพื่อเริ่มใช้งาน", "To get started"],
    ["ตั้งค่าโปรไฟล์", "Edit Profile"],
    ["แผงควบคุมระบบ", "Admin Panel"],
    ["แผงควบคุม", "Dashboard"],
    ["ติดตั้งแอปพลิเคชัน", "Install App"],
    ["เกี่ยวกับแอปพลิเคชัน", "About App"],
    ["เปลี่ยนภาษา", "Language"],
    ["โหมดมืด", "Dark Mode"],
    ["โหมดสว่าง", "Light Mode"],
    ["โหมดกลางคืน", "Dark Mode"],
    ["ธีมและการแสดงผล", "Theme & Appearance"],
    ["สลับโหมดมืด/สว่าง", "Toggle Dark/Light Mode"],
    ["ตัวเลือกและการจัดการ", "Options & Settings"],
    ["บัญชีและโปรไฟล์", "Account & Profile"],
    ["ความปลอดภัย", "Security"],
    ["แก้ไขข้อมูลส่วนตัว", "Edit Profile Info"],
    ["เปลี่ยนรูปภาพ, ชื่อแสดง, คำแนะนำตัว และเมือง", "Change avatar, display name, bio, and city"],
    ["ดูรายการจุดเช็คอินที่คุณชื่นชอบ", "View your bookmarked check-in places"],
    ["ประวัติการแชร์ภาพและสถานที่ทั้งหมดของคุณ", "Your complete photo & check-in history"],
    ["ออกจากบัญชีนี้บนอุปกรณ์นี้อย่างปลอดภัย", "Safely log out of your account on this device"],
    ["แผงควบคุมระบบ (Admin Panel)", "Admin Panel"],
    ["จัดการสมาชิก, โพสต์, สถานที่ และคอนฟิก", "Manage users, posts, locations & config"],
    ["ออกจากระบบ", "Log Out"],
    ["เข้าสู่ระบบ", "Log In"],
    ["สมัครสมาชิก", "Sign Up"],

    // Top Header & Search & Greetings
    ["สวัสดี, ", "Hello, "],
    ["สวัสดี! ยินดีต้อนรับ 👋", "Hello! Welcome 👋"],
    ["สวัสดี 👋", "Hello 👋"],
    ["วันนี้อยากไปที่ไหน?", "Where would you like to go today?"],
    ["ค้นหาสถานที่, ผู้ใช้, หรือเรื่องราวต่างๆ...", "Search places, users, stories..."],
    ["ค้นหาสถานที่...", "Search places..."],
    ["ค้นหาชื่อ, อีเมล, IP, หรือ OS...", "Search name, email, IP, or OS..."],
    ["กำลังระบุพิกัดของคุณ...", "Locating you..."],
    ["กำลังอัปเดตพิกัด...", "Updating coordinates..."],
    ["เปิดใช้งานอยู่", "Active"],
    ["คลิกเพื่อเปิด GPS", "Click to enable GPS"],
    ["คลิกเพื่อเปิด/ระบุตำแหน่ง GPS เรียลไทม์", "Click to enable/update real-time GPS"],
    ["คลิกเพื่ออัปเดตตำแหน่งล่าสุด", "Click to refresh latest GPS location"],
    ["อัปเดตพิกัด GPS ล่าสุดเรียบร้อยแล้ว", "GPS coordinates updated successfully"],

    // Categories & Filters & Stories
    ["สถานที่แนะนำ", "Recommended Places"],
    ["โพสต์ล่าสุด", "Latest Posts"],
    ["หมวดหมู่ทั้งหมด", "All Categories"],
    ["ทั้งหมด", "All"],
    ["ใกล้ฉัน", "Near Me"],
    ["ยอดนิยม", "Popular"],
    ["มาใหม่", "New"],
    ["ล่าสุด", "Latest"],
    ["หมวดหมู่", "Categories"],
    ["มุมมองแผนที่", "Map View"],
    ["มุมมองการ์ด", "Grid View"],
    ["ตัวกรอง", "Filters"],
    ["ท่องเที่ยว", "Travel"],
    ["อาหาร", "Food"],
    ["คาเฟ่", "Cafe"],
    ["ธรรมชาติ", "Nature"],
    ["ช้อปปิ้ง", "Shopping"],
    ["ที่พัก", "Stay"],
    ["จุดเช็คอิน", "Check-in Spot"],
    ["ทั่วไป", "General"],
    ["อื่นๆ", "Other"],

    // Feed, Cards & Details
    ["จากตำแหน่งคุณ", "from your location"],
    ["จากคุณ", "from you"],
    ["กม. จากคุณ", "km away"],
    ["ม. จากคุณ", "m away"],
    ["-.- กม.", "-.- km"],
    ["กม.", "km"],
    ["ม.", "m"],
    ["นำทาง", "Directions"],
    ["นำทางไปยังสถานที่นี้", "Navigate to this place"],
    ["แสดงความคิดเห็น", "Comments"],
    ["ความคิดเห็น", "Comments"],
    ["เขียนความคิดเห็น...", "Write a comment..."],
    ["ส่งความคิดเห็น", "Post comment"],
    ["ส่ง", "Send"],
    ["ตอบกลับ", "Reply"],
    ["กำลังตอบกลับ", "Replying to"],
    ["ถูกใจ", "Like"],
    ["ที่ถูกใจ", "Liked"],
    ["บันทึก", "Save"],
    ["แชร์", "Share"],
    ["แชร์จุดเช็คอิน", "Share Check-in Spot"],
    ["แชร์จุดเช็คอินนี้", "Share this check-in"],
    ["แชร์ไปยังโซเชียลมีเดียหรือคัดลอกลิงก์", "Share to social media or copy link"],
    ["แชร์โปรไฟล์นี้", "Share this profile"],
    ["แชร์อื่นๆ", "More Sharing Options"],
    ["เพิ่มเติม", "More"],
    ["คัดลอก", "Copy"],
    ["คัดลอกแล้ว!", "Copied!"],
    ["คัดลอกลิงก์สำเร็จ", "Link copied to clipboard"],
    ["คัดลอกลิงก์", "Copy Link"],
    ["คัดลอกลิงก์ไปยังคลิปบอร์ดแล้ว! 📋", "Link copied to clipboard! 📋"],
    ["เมื่อสักครู่", "Just now"],
    ["นาทีที่แล้ว", "mins ago"],
    ["ชั่วโมงที่แล้ว", "hours ago"],
    ["วันที่แล้ว", "days ago"],
    ["วันก่อน", "days ago"],
    ["ยังไม่มีโพสต์ในหมวดหมู่นี้ เป็นคนแรกที่แชร์รูปภาพ!", "No posts in this category yet. Be the first to share a photo!"],
    ["ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์เลย! 💬", "No comments yet. Be the first to comment! 💬"],
    ["ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น!", "No comments yet. Be the first to share your thoughts!"],
    ["ไม่พบสถานที่ที่ค้นหา", "No locations found"],
    ["ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน", "No unread notifications"],
    ["ไม่มีการแจ้งเตือนในขณะนี้", "No notifications at this time"],
    ["เมื่อมีคนกดถูกใจ แสดงความคิดเห็น หรือติดตามคุณ รายการจะปรากฏที่นี่", "When someone likes, comments, or follows you, it will appear here"],
    ["ก่อนหน้านี้", "Earlier"],
    ["อ่านทั้งหมดแล้ว", "Mark all as read"],
    ["ตัวเลือกโพสต์", "Post options"],
    ["รูปก่อนหน้า", "Previous photo"],
    ["รูปถัดไป", "Next photo"],
    ["ดับเบิ้ลคลิกเพื่อกดถูกใจ หรือคลิกเพื่อดูรายละเอียด", "Double click to like or click for details"],
    ["ดับเบิ้ลคลิกเพื่อถูกใจ หรือคลิกเพื่อดูรายละเอียด", "Double click to like or click for details"],
    ["ดับเบิ้ลคลิกเพื่อกดถูกใจ", "Double click to like"],

    // Location Names & Districts
    ["(เมืองSisaket)", "(Mueang Sisaket)"],
    ["(เมืองศรีสะเกษ)", "(Mueang Sisaket)"],
    ["เมืองSisaket", "Mueang Sisaket"],
    ["เมืองศรีสะเกษ", "Mueang Sisaket"],
    ["อ.เมืองศรีสะเกษ", "Mueang Sisaket District"],
    ["อำเภอเมืองศรีสะเกษ", "Mueang Sisaket District"],
    ["เกาะกลางน้ำ", "Koh Klang Nam"],
    ["บ้านผมเองครับ", "My House"],
    ["วัดสระกำแพงใหญ่", "Wat Sa Kamphaeng Yai"],
    ["สวนสมเด็จพระศรีนครินทร์ ศรีสะเกษ", "Somdet Phra Srinagarindra Park Sisaket"],
    ["สวนสมเด็จพระศรีนครินทร์", "Somdet Phra Srinagarindra Park"],
    ["วัดมหาพุทธาราม (วัดพระโต)", "Wat Maha Phuttharam (Wat Phra To)"],
    ["วัดมหาพุทธาราม", "Wat Maha Phuttharam"],
    ["ศูนย์แสดงพันธุ์สัตว์น้ำศรีสะเกษ (Sisaket Aquarium)", "Sisaket Aquarium"],
    ["ศูนย์แสดงพันธุ์สัตว์น้ำศรีสะเกษ", "Sisaket Aquarium"],
    ["ศูนย์แสดงพันธุ์สัตว์น้ำ", "Sisaket Aquarium"],
    ["ศาลหลักเมืองศรีสะเกษ", "Sisaket City Pillar Shrine"],
    ["ศาลหลักเมือง", "City Pillar Shrine"],
    ["หอศรีลำดวนเฉลิมพระเกียรติ (หอชมเมืองศรีสะเกษ)", "Sri Lamduan Tower (Sisaket City Tower)"],
    ["หอศรีลำดวนเฉลิมพระเกียรติ", "Sri Lamduan Tower"],
    ["หอชมเมืองศรีสะเกษ", "Sisaket City Tower"],
    ["คาเฟ่อินสวน ศรีสะเกษ (In Suan Cafe)", "In Suan Cafe Sisaket"],
    ["คาเฟ่อินสวน ศรีสะเกษ", "In Suan Cafe Sisaket"],
    ["คาเฟ่อินสวน", "In Suan Cafe"],
    ["ร้านอาหารบ้านสวนศรีสะเกษ", "Baan Suan Sisaket Restaurant"],
    ["ร้านอาหารบ้านสวน", "Baan Suan Restaurant"],
    ["ศรีสะเกษ", "Sisaket"],
    ["อุบลราชธานี", "Ubon Ratchathani"],
    ["สุรินทร์", "Surin"],
    ["ยโสธร", "Yasothon"],
    ["ร้อยเอ็ด", "Roi Et"],

    // Users
    ["อภิวัฒน์ อบอุ่น", "Apiwat Oboun"],
    ["ปุณยเทพ อารีย์รัตน์กุล", "Punyatep Areerattanakul"],
    ["อารินทร์", "Arin"],

    // User Profile & Follow & Stats
    ["ผู้ติดตาม", "Followers"],
    ["กำลังติดตาม", "Following"],
    ["โพสต์เรื่องราว", "Stories posted"],
    ["โพสต์", "Posts"],
    ["รูปภาพ", "Photos"],
    ["สถานที่", "Places"],
    ["ถูกใจที่ได้รับ", "Likes received"],
    ["ติดตาม", "Follow"],
    ["เลิกติดตาม", "Unfollow"],
    ["แก้ไขโปรไฟล์", "Edit Profile"],
    ["แก้ไขข้อมูลส่วนตัวเรียบร้อยแล้ว", "Profile saved successfully"],
    ["ชื่อที่แสดง", "Display Name"],
    ["ประวัติโดยย่อ", "Bio"],
    ["รูปโปรไฟล์", "Profile Picture"],
    ["รูปหน้าปก", "Cover Photo"],
    ["บันทึกการเปลี่ยนแปลง", "Save Changes"],
    ["บันทึกข้อมูล", "Save"],
    ["ยกเลิก", "Cancel"],
    ["ยืนยัน", "Confirm"],
    ["ปิด", "Close"],
    ["ปิดหน้าต่าง", "Close Window"],
    ["ลบ", "Delete"],
    ["แก้ไข", "Edit"],
    ["ยังไม่ได้ระบุคำแนะนำตัว — เริ่มต้นแชร์มุมโปรดของคุณได้ง่ายๆ!", "No bio specified yet — start sharing your favorite spots easily!"],

    // Admin Panel & Audits
    ["ผู้ใช้งานในระบบ", "System Users"],
    ["ตรวจสอบ IP Address, ตำแหน่งที่สมัคร, และระบบปฏิบัติการของอุปกรณ์ผู้ใช้งาน", "Inspect IP address, signup location, and operating system of client devices"],
    ["ผู้ใช้งาน", "User"],
    ["อีเมล / ช่องทาง", "Email / Method"],
    ["สถานที่ & IP (ตอนสมัคร)", "Location & IP (Signup)"],
    ["อุปกรณ์ & ระบบปฏิบัติการ", "Device & OS"],
    ["สถานะ", "Status"],
    ["วันที่สมัคร", "Signup Date"],
    ["การจัดการ", "Actions"],
    ["ปกติ", "Active"],
    ["ถูกระงับ", "Suspended"],
    ["ระงับการใช้งาน", "Suspended"],
    ["ปลดระงับ", "Unsuspend"],
    ["ระงับบัญชี", "Suspend Account"],
    ["สถานะทั้งหมด", "All Statuses"],
    ["ค้นหา", "Search"],
    ["ดูรายละเอียดเครื่องและ IP ละเอียด", "View detailed device & IP audit"],
    ["แก้ไขข้อมูล", "Edit User"],
    ["ลบผู้ใช้งาน", "Delete User"],
    ["สลับสถานะระงับบัญชี?", "Toggle Account Suspension?"],
    ["ยืนยันการลบผู้ใช้?", "Confirm User Deletion?"],
    ["ข้อมูลการสมัครสมาชิก (Registration Info)", "Registration Information (Registration Info)"],
    ["🌐 IP Address ที่ใช้สมัคร:", "🌐 Registration IP Address:"],
    ["📍 ตำแหน่ง/สถานที่:", "📍 Location / Region:"],
    ["💻 ระบบปฏิบัติการ (OS):", "💻 Operating System (OS):"],
    ["📱 อุปกรณ์ & เบราว์เซอร์:", "📱 Device & Browser:"],
    ["🔑 ช่องทางการสมัคร:", "🔑 Signup Method:"],
    ["📅 วันและเวลาที่สมัคร:", "📅 Signup Date & Time:"],
    ["การเข้าใช้งานล่าสุด (Last Login Activity)", "Last Login Activity (Last Login Activity)"],
    ["🌐 IP ล่าสุด:", "🌐 Last Login IP:"],
    ["📍 สถานที่ล่าสุด:", "📍 Last Location:"],
    ["💻 OS ล่าสุด:", "💻 Last OS:"],
    ["🧭 เบราว์เซอร์ล่าสุด:", "🧭 Last Browser:"],
    ["แก้ไขข้อมูลผู้ใช้", "Edit User Information"],
    ["ชื่อแสดง", "Display Name"],
    ["อีเมล", "Email"],
    ["สิทธิ์ Staff (Admin)", "Staff (Admin) Privileges"],
    ["คอมพิวเตอร์ (Desktop)", "Desktop PC"],
    ["สมาร์ตโฟน (มือถือ)", "Smartphone (Mobile)"],
    ["แท็บเล็ต (แท็บเล็ต)", "Tablet"],
    ["เว็บเบราว์เซอร์", "Web Browser"],
    ["เว็บฟอร์ม", "Web Form"],
    ["ศรีสะเกษ, ประเทศไทย", "Sisaket, Thailand"],
    ["นครราชสีมา, ประเทศไทย", "Nakhon Ratchasima, Thailand"],
    ["กรุงเทพมหานคร, ประเทศไทย", "Bangkok, Thailand"],
    ["เชียงใหม่, ประเทศไทย", "Chiang Mai, Thailand"],
    ["ประเทศไทย", "Thailand"],

    // PWA & GPS Permissions
    ["ติดตั้งแอป ที่นี่มีอะไร?", "Install What's Here?"],
    ["ใช้งานเร็วขึ้น ไหลลื่น ไม่เปลืองเน็ต", "Faster, smoother, data-saving"],
    ["ติดตั้ง", "Install"],
    ["อนุญาตการเข้าถึงพิกัด GPS 📍", "Allow GPS Location Access 📍"],
    ["แอป \"ที่นี่มีอะไร?\" ขออนุญาตระบุตำแหน่ง GPS เพื่อคำนวณระยะทางจากสถานที่ท่องเที่ยวจริง และแสดงจุดเช็กอินรอบตัวคุณแบบเรียลไทม์", "The \"What's Here?\" app requests permission to access your GPS to calculate real distance to attractions and show nearby check-in spots in real time."],
    ["ไว้ภายหลัง", "Not Now"],
    ["อนุญาตเปิด GPS", "Enable GPS"],

    // Dialogs & Notifications
    ["คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?", "Are you sure you want to log out?"],
    ["ออกจากระบบสำเร็จ", "Logged out successfully"],
    ["ยินดีต้อนรับกลับ", "Welcome back"],
    ["เข้าสู่ระบบด้วย Google สำเร็จ!", "Google login successful!"],
    ["เข้าสู่ระบบด้วย LINE สำเร็จ!", "LINE login successful!"],
    ["ออกจากระบบเรียบร้อยแล้ว", "Logged out successfully"],
    // Main Navigation & Actions
    ["หน้าหลัก", "Home"],
    ["หน้าแรก", "Home"],
    ["ดูรายละเอียด", "View Details"],
    ["โดย ", "By "],
    ["โดย", "By"],
    ["GPS: เปิดใช้งานอยู่", "GPS: Active"],
    ["GPS: กำลังระบุพิกัดของคุณ...", "GPS: Locating you..."],
    ["คลิกเพื่อเปิด GPS", "Click to enable GPS"],
    ["คลิกเพื่อเปิด/ระบุตำแหน่ง GPS เรียลไทม์", "Click to enable/update real-time GPS"],
    ["ได้เริ่มติดตามคุณ", "started following you"],
    ["ได้กดถูกใจโพสต์ของคุณ", "liked your post"],
    ["ได้แสดงความคิดเห็นบนโพสต์ของคุณ", "commented on your post"]
  ];

  // Map lookups
  const thToEnMap = new Map();
  const enToThMap = new Map();

  // Sort by length descending to match longest phrases first
  const sortedPairs = [...TH_EN_MAP].sort((a, b) => b[0].length - a[0].length);

  sortedPairs.forEach(([th, en]) => {
    thToEnMap.set(th, en);
    enToThMap.set(en, th);
  });

  // Track original Thai text for exact restore
  const originalTextMap = new WeakMap();

  function translateText(text, targetLang) {
    if (!text || typeof text !== 'string') return text;
    const trimmed = text.trim();
    if (!trimmed) return text;

    if (targetLang === 'en') {
      // 1. Exact match (handles single words, buttons, menu labels)
      if (thToEnMap.has(trimmed)) {
        return text.replace(trimmed, thToEnMap.get(trimmed));
      }

      let result = text;

      // Distance and time regex replacements
      result = result.replace(/(\d+(\.\d+)?|-.-)\s*กม\./g, '$1 km');
      result = result.replace(/(\d+)\s*ม\./g, '$1 m');
      result = result.replace(/(\d+)\s*นาทีที่แล้ว/g, '$1 mins ago');
      result = result.replace(/(\d+)\s*ชั่วโมงที่แล้ว/g, '$1 hours ago');
      result = result.replace(/(\d+)\s*วัน(ที่แล้ว|ก่อน)/g, '$1 days ago');

      // 2. Full phrase replacement for compound sentences (length > 4)
      for (const [th, en] of sortedPairs) {
        if (th.length <= 4) continue;
        if (result.includes(th)) {
          result = result.split(th).join(en);
        }
      }

      // 3. Match short words with word boundaries or exact positions (prevents 'ปิด' inside 'เปิด')
      for (const [th, en] of sortedPairs) {
        if (th.length > 4) continue;
        if (result.trim() === th) {
          result = result.replace(th, en);
        } else if (result.includes(` ${th} `)) {
          result = result.split(` ${th} `).join(` ${en} `);
        } else if (result.startsWith(`${th} `)) {
          result = `${en} ` + result.slice(th.length + 1);
        } else if (result.endsWith(` ${th}`)) {
          result = result.slice(0, -(th.length + 1)) + ` ${en}`;
        }
      }
      return result;
    } else {
      if (enToThMap.has(trimmed)) {
        return text.replace(trimmed, enToThMap.get(trimmed));
      }
      let result = text;
      result = result.replace(/(\d+(\.\d+)?|-.-)\s*km/g, '$1 กม.');
      result = result.replace(/(\d+)\s*m(?!\w)/g, '$1 ม.');
      result = result.replace(/(\d+)\s*mins? ago/g, '$1 นาทีที่แล้ว');
      result = result.replace(/(\d+)\s*hours? ago/g, '$1 ชั่วโมงที่แล้ว');
      result = result.replace(/(\d+)\s*days? ago/g, '$1 วันที่แล้ว');

      for (const [th, en] of sortedPairs) {
        if (result.includes(en)) {
          result = result.split(en).join(th);
        }
      }
      return result;
    }
  }

  function applyLanguageToNode(node, targetLang) {
    if (!node) return;

    // 1. Text Nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!parent) return;
      const tagName = parent.tagName ? parent.tagName.toUpperCase() : '';
      if (['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA'].includes(tagName)) return;

      const currentVal = node.nodeValue;
      if (!currentVal || !currentVal.trim()) return;

      if (!originalTextMap.has(node)) {
        originalTextMap.set(node, currentVal);
      }

      const origTh = originalTextMap.get(node);

      if (targetLang === 'en') {
        const translated = translateText(origTh, 'en');
        if (node.nodeValue !== translated) {
          node.nodeValue = translated;
        }
      } else {
        if (node.nodeValue !== origTh) {
          node.nodeValue = origTh;
        }
      }
      return;
    }

    // 2. Element Attributes (placeholder, title, aria-label)
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node;

      // Attributes to translate
      ['placeholder', 'title', 'aria-label'].forEach(attr => {
        if (el.hasAttribute && el.hasAttribute(attr)) {
          const key = `_orig_${attr}`;
          if (!el[key]) {
            el[key] = el.getAttribute(attr);
          }
          const orig = el[key];
          if (targetLang === 'en') {
            el.setAttribute(attr, translateText(orig, 'en'));
          } else {
            el.setAttribute(attr, orig);
          }
        }
      });

      // Recurse children
      const children = Array.from(node.childNodes);
      for (let i = 0; i < children.length; i++) {
        applyLanguageToNode(children[i], targetLang);
      }
    }
  }

  function applyAppLanguage(lang) {
    const targetLang = (lang === 'en') ? 'en' : 'th';
    localStorage.setItem('app_lang', targetLang);
    document.documentElement.setAttribute('lang', targetLang);

    // Update pill switcher UI
    const thOpts = document.querySelectorAll('#langOptTh, .lang-opt-th');
    const enOpts = document.querySelectorAll('#langOptEn, .lang-opt-en');
    
    thOpts.forEach(el => {
      if (targetLang === 'th') el.classList.add('active');
      else el.classList.remove('active');
    });

    enOpts.forEach(el => {
      if (targetLang === 'en') el.classList.add('active');
      else el.classList.remove('active');
    });

    // Translate DOM
    if (document.body) {
      applyLanguageToNode(document.body, targetLang);
    }

    if (typeof recalculateAllDistances === 'function') {
      recalculateAllDistances();
    }
  }

  function toggleAppLanguage() {
    const current = localStorage.getItem('app_lang') || 'th';
    const next = (current === 'th') ? 'en' : 'th';
    applyAppLanguage(next);

    const toastMsg = (next === 'en') ? 'Language switched to English' : 'เปลี่ยนภาษาเป็น ภาษาไทย เรียบร้อยแล้ว';
    if (typeof showCustomToast === 'function') {
      showCustomToast(toastMsg, 'info');
    } else if (typeof showToast === 'function') {
      showToast(toastMsg, 'info');
    }
  }

  // Expose to window
  window.applyAppLanguage = applyAppLanguage;
  window.toggleAppLanguage = toggleAppLanguage;

  // Initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('app_lang') || 'th';
    if (saved === 'en') {
      setTimeout(() => {
        applyAppLanguage('en');
      }, 30);
    }
  });

  // Watch for dynamic DOM additions (modals, drawers, new posts)
  if (window.MutationObserver) {
    const observer = new MutationObserver((mutations) => {
      const current = localStorage.getItem('app_lang');
      if (current === 'en') {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
              applyLanguageToNode(node, 'en');
            }
          });
        });
      }
    });

    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });
  }
})();
