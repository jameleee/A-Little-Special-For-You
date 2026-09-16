# Thiết kế nút “Không” nhây và màn cào mở quà

## Mục tiêu

Cập nhật thiệp tỏ tình hiện tại để người tạo thiệp có thể sửa toàn bộ nội dung mới qua `data/content.json`. Nút “Không” sẽ tạo tương tác vui trên chính màn tỏ tình. Nút “Đồng ý” sẽ dẫn tới một màn cào để mở ảnh món quà trước khi tiếp tục sang lời cảm ơn và màn nhạc.

## Luồng trải nghiệm

Luồng chính đến màn `question` giữ nguyên. Tại màn này:

- Nút “Đồng ý” dùng hành động `goto` để đến màn `scratch-gift`.
- Nút “Không” không chuyển màn hình. Mỗi lần bấm, một mẩu giấy nhỏ phía trên hai nút hiển thị câu tiếp theo trong danh sách `teaseMessages` của màn hình.
- Khi đã đến câu cuối, các lần bấm sau giữ nguyên câu cuối.
- Nút không đổi vị trí, không né con trỏ, không biến mất và không tự kích hoạt lựa chọn “Đồng ý”.
- Khi quay khỏi màn rồi trở lại, chuỗi câu bắt đầu lại từ đầu để trạng thái chỉ tồn tại trong lần xem hiện tại.

Luồng khi đồng ý:

`question → scratch-gift → accepted → music`

Màn `scratch-gift` hiển thị ảnh món quà bên dưới một lớp phủ kraft. Người đọc cào bằng chuột, bút hoặc ngón tay. Khi diện tích đã cào đạt ngưỡng cấu hình, phần phủ mờ hoàn toàn, ảnh quà được công bố và nút tiếp tục xuất hiện. Nút này dẫn tới màn `accepted` hiện có, sau đó tiếp tục tới màn nhạc.

## Kiến trúc JSON

Màn `question` bổ sung cấu hình:

```json
{
  "tease": {
    "messages": [
      "Chị chắc chưa?",
      "Suy nghĩ lại một chút đi mà…",
      "Anh cho chị thêm một cơ hội chọn lại đó 😌"
    ],
    "finalBehavior": "hold"
  }
}
```

Nút “Không” dùng `action: "tease"`. Bộ kiểm tra JSON chấp nhận hành động này chỉ trên màn có danh sách tease hợp lệ. `messages` phải là danh sách chuỗi không rỗng; `finalBehavior` chỉ hỗ trợ `hold` trong phạm vi thay đổi này.

Thêm loại màn hình `scratch-gift`:

```json
{
  "id": "scratch-gift",
  "type": "scratch-gift",
  "title": "Có một món quà nhỏ cho chị",
  "instruction": "Dùng tay cào lớp giấy để mở quà nhé.",
  "gift": {
    "src": "assets/images/gift.jpg",
    "alt": "Món quà anh dành cho chị",
    "fallbackText": "Ảnh món quà sẽ được đặt ở đây.",
    "coverText": "Cào ở đây",
    "revealThreshold": 0.55
  },
  "revealText": "Quà của chị đây rồi.",
  "buttons": [
    {
      "label": "Mở quà xong rồi",
      "action": "goto",
      "target": "accepted",
      "showAfterReveal": true
    }
  ]
}
```

Mọi nội dung nhìn thấy được đều lấy từ JSON: câu nhây, tiêu đề, hướng dẫn, chữ trên lớp cào, lời công bố, nhãn nút, ảnh, alt và lời dự phòng khi thiếu ảnh. Ngưỡng cào nhận số từ `0.1` đến `0.9`; mặc định sử dụng `0.55` trong dữ liệu mẫu.

## Thành phần và hành vi

### Tương tác “Không”

Renderer câu hỏi tạo sẵn một vùng thông báo có `aria-live="polite"`. Vùng này chỉ chiếm không gian sau lần bấm đầu để tránh một khoảng trống lớn trước đó. Mỗi lần bấm hành động `tease`, renderer tăng chỉ số nhưng chặn tại phần tử cuối. Câu mới dùng hiệu ứng mờ nhẹ và không làm thay đổi vị trí hai nút.

Trạng thái câu nhây thuộc renderer của màn `question`, không được lưu vào JSON, URL hay bộ nhớ trình duyệt. Khi chuyển màn, cleanup loại bỏ trạng thái và bộ lắng nghe liên quan.

### Màn cào quà

Renderer mới đặt ảnh hoặc khung dự phòng trong một khung Polaroid lớn. Một `canvas` phủ toàn bộ vùng ảnh. Canvas được tô bằng màu kraft và một lớp hạt giấy nhẹ, sau đó vẽ `coverText` ở giữa.

Pointer Events xử lý chuột, cảm ứng và bút bằng cùng một luồng. Khi bắt đầu cào, canvas ghi nhận pointer, xóa một đường tròn mềm theo chuyển động và ngăn cuộn trang chỉ trong lúc pointer đang hoạt động trên vùng cào. Kích thước nét cào thay đổi theo chiều rộng khung để sử dụng tốt trên điện thoại.

Phần trăm đã cào được tính theo lưới mẫu thưa trên alpha channel sau mỗi số lượng nét giới hạn, tránh đọc toàn bộ canvas ở mọi sự kiện. Khi đạt `revealThreshold`, renderer đánh dấu hoàn tất một lần, mờ canvas, thông báo `revealText` và hiện nút tiếp tục. Người dùng bàn phím hoặc công nghệ hỗ trợ có nút phụ “Mở quà không cần cào”, lấy nhãn từ `ui.revealGift`, để truy cập cùng kết quả mà không cần thao tác kéo.

Canvas tự điều chỉnh theo kích thước hiển thị và device pixel ratio có giới hạn để nét vẽ rõ nhưng không tốn bộ nhớ quá mức. Khi `prefers-reduced-motion` được bật, lớp phủ biến mất ngay khi đạt ngưỡng mà không dùng chuyển động mờ.

Nếu ảnh tải lỗi, renderer hiển thị khung giấy với `fallbackText`; thao tác cào vẫn hoạt động và công bố khung này. Không hiện biểu tượng ảnh hỏng và không làm màn hình trắng.

## Giao diện

Tương tác mới tiếp tục phong cách giấy kraft hiện có. Mẩu nhây là một mảnh giấy kem nhỏ, chữ viết tay, hơi xoay nhưng dễ đọc. Màn cào dùng một Polaroid lớn ở giữa màn hình, băng dính nhỏ ở mép trên và lớp phủ kraft có hướng dẫn rõ ràng. Không thêm confetti, tim bay, chuyển động nảy hoặc màu hồng nổi bật.

Ở khung 390 × 844, vùng cào đủ lớn để thao tác bằng ngón tay nhưng toàn bộ tiêu đề, hướng dẫn và điều hướng vẫn nằm trong luồng cuộn bình thường. Trên desktop, trải nghiệm tiếp tục giới hạn ở chiều rộng 420px.

## Xử lý lỗi và tính tương thích

Bộ kiểm tra dữ liệu bổ sung các lỗi sau: loại màn hình scratch không hợp lệ, thiếu cấu hình gift, đường dẫn ảnh không tương đối, thiếu alt hoặc fallback text, ngưỡng ngoài khoảng cho phép, tease rỗng, `action: tease` đặt sai màn hình và nút sau khi cào không có đích hợp lệ.

Nếu canvas hoặc Pointer Events không hoạt động, nút “Mở quà không cần cào” vẫn cho phép hoàn thành luồng. Không tải thư viện ngoài; tính năng tiếp tục dùng HTML, CSS và JavaScript thuần, tương thích GitHub Pages và đường dẫn repository con.

## Kiểm tra

- Chạy kiểm tra cú pháp JavaScript và bộ kiểm tra dữ liệu hiện có.
- Thêm ca kiểm tra JSON hợp lệ cho `tease` và `scratch-gift`, cùng các trường hợp thiếu trường, ngưỡng sai và hành động tease sai vị trí.
- Kiểm tra thủ công tại 390 × 844: mỗi lần bấm “Không” tiến đúng một câu, câu cuối đứng yên và hai nút không dịch chuyển.
- Kiểm tra chuột và mô phỏng cảm ứng trên vùng cào; xác nhận nút tiếp tục chỉ xuất hiện sau khi mở quà.
- Kiểm tra nút truy cập bằng bàn phím mở quà mà không cần cào.
- Kiểm tra ảnh quà hợp lệ và ảnh quà bị thiếu.
- Kiểm tra toàn luồng `question → scratch-gift → accepted → music`, lịch sử quay lại và không có tràn ngang.
- Kiểm tra bản đóng gói GitHub Pages sau khi đồng bộ `dist` và tạo lại ZIP.

## Phạm vi bàn giao

Cập nhật `data/content.json`, renderer và validator trong `js/app.js`, giao diện trong `css/style.css`, tài liệu README, bản `dist` và `thiepqr-github-pages.zip`. Ảnh quà thật không được tự tạo; đường dẫn mặc định là `assets/images/gift.jpg` và có trạng thái dự phòng cho đến khi người dùng thay ảnh.
