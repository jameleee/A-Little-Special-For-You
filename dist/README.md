# Thiệp QR — Một lá thư nhỏ

Thiệp tỏ tình tiếng Việt, phong cách giấy kraft và scrapbook. HTML/CSS/JavaScript thuần, không npm, không backend, không bước build.

## Mở thiệp

Chạy một máy chủ HTTP trong thư mục này, ví dụ `python3 -m http.server 8080 --bind 127.0.0.1`, rồi mở http://127.0.0.1:8080. Không mở bằng file:// vì trình duyệt chặn fetch JSON.

## Chỉnh nội dung

Chỉ sửa **data/content.json**:
- `settings`: trang bắt đầu, tiêu đề tab, đầu/chân thư, debug, bật/tắt nhạc.
- `theme`: background, paper, text, accent.
- `ui`: nhãn điều hướng, trình phát, thao tác cào quà, thông báo ảnh/nhạc dự phòng và lỗi.
- `screens`: toàn bộ lời thư, hình ảnh, thứ tự, loại trang, nút và đích chuyển trang.

Mặc định có 14 màn hình, gồm hai trang ảnh scrapbook. Màn mở phong bì tự chuyển sau 1,45 giây. Quay lại bỏ qua màn chuyển động để không bị lặp.

Ảnh và bài hát cá nhân chưa được cung cấp. Đây là trạng thái dự phòng có chủ đích; không có ảnh đôi hay bài hát giả. Thay hoặc thêm:
- `assets/images/photo-01.jpg` đến `photo-07.jpg` cho hai trang kỷ niệm.
- `assets/images/gift.jpg` cho ảnh hiện ra dưới lớp cào.
- `assets/audio/song.mp3`.
- `assets/stickers/`: đã có cat.png, leaf.png, camera.png, flower.png, paper-plane.png.

Có thể đổi tên và đường dẫn trong JSON; tất cả đường dẫn phải tương đối và nằm trong thư mục website. Caption, alt và lời ở khung ảnh dự phòng cũng sửa trong JSON. Nên dùng ảnh JPEG/WebP khoảng 1000px và dưới 300KB/ảnh, MP3 vừa đủ dài cho bài hát.

## Thêm một trang

Chèn đối tượng này vào vị trí mong muốn trong `screens`; không sửa JavaScript:

```json
{
  "id": "another-letter",
  "type": "letter",
  "title": "Thêm một điều nữa,",
  "paragraphs": ["Nội dung anh muốn gửi em."],
  "navigation": {
    "showBack": true,
    "showNext": true,
    "backLabel": "Quay lại",
    "nextLabel": "Tiếp"
  },
  "animation": {"enter": "fade-up", "duration": 450}
}
```

Mỗi id phải duy nhất. Các loại trang: intro, envelope, envelope-open, letter, gallery, question, scratch-gift, result, music, ending.
- intro: title và ít nhất một button; subtitle, eyebrow, note tùy chọn.
- envelope: ít nhất một button để mở; envelopeText, title, hint tùy chọn.
- envelope-open: autoAdvance bắt buộc.
- letter/result: paragraphs không rỗng.
- gallery: title, layout, images; mỗi ảnh cần src, alt, có thể có caption, placeholder, rotation.
- question: title, question, `tease.messages` và ít nhất hai buttons. Nút nhây dùng `action: "tease"`; đến câu cuối sẽ giữ nguyên.
- scratch-gift: title, instruction, revealText, gift và buttons. `gift.src`, `gift.alt`, `gift.fallbackText`, `gift.coverText` đều sửa được; `gift.revealThreshold` nhận giá trị từ 0.1 đến 0.9.
- music: title, src; endingParagraphs, endingSignature, finalNote tùy chọn.
- ending: title, các trường paragraphs/note/signature/buttons dùng như trang thư.

Thư viện bố cục ảnh: single-polaroid, polaroid-stack, two-polaroid, three-polaroid và photo-template. Hai trang kỷ niệm mặc định dùng `photo-frame-duo.jpg` cho 2 ảnh và `photo-frame-mosaic.jpg` cho 5 ảnh. Với photo-template, mỗi phần tử trong `template.slots` đặt một ảnh bằng phần trăm x, y, width, height và rotation; số slot phải bằng số ảnh.

## Điều hướng

`next` đi theo thứ tự mảng; `previous` quay lại theo lịch sử thực tế; `goto` đi đến id bất kỳ. Khi thêm trang sau một nút goto, đổi target nếu muốn đi qua trang mới.

```json
{"label": "Tiếp tục", "action": "goto", "target": "music"}
```

Luồng đồng ý mặc định là `question → scratch-gift → accepted → music`. Nút “Không” chỉ đổi câu nhây trên màn hiện tại, không chuyển màn và không lưu câu trả lời. `branchOnly: true` loại một màn phụ khỏi tổng số dấu tiến trình; `progress: false` ẩn dấu tiến trình trên trang đó. Thiệp không gửi/lưu lựa chọn ở máy chủ; anh sẽ không tự nhận được thông báo.

Ví dụ cấu hình câu nhây:

```json
{
  "tease": {
    "messages": ["Em chắc chưa??", "Suy nghĩ lại chút đi mà…", "Anh vẫn để câu trả lời ở đây nhé."],
    "finalBehavior": "hold"
  }
}
```

Ảnh quà nằm dưới một lớp canvas màu kraft. Người đọc có thể cào bằng chuột, bút hoặc ngón tay; nút `ui.revealGift` cho phép mở bằng bàn phím. Khi đạt ngưỡng, nút có `showAfterReveal: true` mới xuất hiện.

```json
{"autoAdvance": {"action": "next", "delay": 1450}}
```

Không tạo chuỗi tự chuyển vòng tròn. `previous` không làm gì khi chưa có lịch sử.

## Sticker và chuyển động

```json
{
  "decorations": [
    {"type": "sticker", "src": "assets/stickers/leaf.png", "position": "bottom-right", "size": 60, "rotation": -5},
    {"type": "tape", "position": "top-center", "size": 100, "rotation": 4}
  ]
}
```

Loại trang trí: sticker, tape, note, doodle. Note dùng text; doodle dùng text hoặc src. Vị trí: top-left, top-center, top-right, bottom-left, bottom-center, bottom-right. Giữ khoảng 1–2 món/trang. Trang trí không chặn nút bấm.

Chuyển động: fade, fade-up, slide-up, scale-in, paper-in; envelope-open cho phong bì. Tôn trọng prefers-reduced-motion. Nhạc chỉ phát khi người đọc nhấn nút Phát nhạc; chuyển trang sẽ dừng nhạc.

## Lỗi và debug

JSON sai cú pháp, trùng id, loại trang lạ, thiếu trường bắt buộc hoặc goto không tồn tại sẽ hiện thẻ lỗi. Bật `settings.debug` để xem id trang và nhật ký điều hướng/validation trong console. Khi chính JSON không tải/không đọc được, engine dùng lời báo lỗi tối thiểu dự phòng vì không thể lấy lời từ tệp bị lỗi.

Ảnh thiếu được thay bằng khung giấy; sticker thiếu tự ẩn; âm thanh thiếu vô hiệu hóa trình phát.

## GitHub Pages

1. Đưa các tệp trong thư mục này lên một repository GitHub.
2. Vào Settings → Pages, chọn Deploy from a branch.
3. Chọn nhánh chứa mã (thường main), thư mục / (root), rồi Save.
4. Mở URL GitHub Pages được trả về. Đường dẫn tương đối hoạt động cả tại /tên-repo/.
5. Dùng URL đó khi tạo mã QR để gửi em.

Không cần npm, workflow build hoặc dịch vụ backend. Thư mục dist là bản sao tĩnh dành cho bản xem trước Sites; khi dùng GitHub Pages, chọn root và sửa các tệp gốc. Thông tin .openai chỉ phục vụ Sites.

## Kiểm tra

`node --check js/app.js` kiểm tra cú pháp. `node tests/validate.cjs` chạy kiểm tra dữ liệu và cấu hình, gồm cả tease và scratch-gift (chỉ dùng Node có sẵn, không cài thư viện; không cần Node khi triển khai).

Kiểm tra thủ công: 390×844, các màn thư, next/back, câu nhây dừng ở câu cuối, cào quà, mở quà bằng bàn phím, gallery, nhạc, trường hợp thiếu tài nguyên, giảm chuyển động, desktop và thêm màn mới bằng JSON.

## Tài nguyên

Font Dancing Script, Patrick Hand, Lora và Be Vietnam Pro được lưu trong assets/fonts và dùng giấy phép SIL Open Font License đi kèm. Sticker được tạo bằng ImageGen cho dự án này. Không tải font hay thư viện bên ngoài khi mở thiệp.
