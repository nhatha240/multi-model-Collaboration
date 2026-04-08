# Multi-Model Collaboration

Dự án **Multi-Model Collaboration** xây dựng một hệ thống cộng tác đa mô hình AI, trong đó **Claude** đóng vai trò **supervisor / coordinator** điều phối toàn bộ quy trình, còn các tác vụ cụ thể được giao cho **OpenAI Codex** thực thi.

---

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────┐
│              Claude (Supervisor)             │
│  - Phân tích yêu cầu từ người dùng          │
│  - Lập kế hoạch & chia nhỏ công việc        │
│  - Điều phối & tổng hợp kết quả             │
└────────────────────┬────────────────────────┘
                     │ giao task
          ┌──────────▼──────────┐
          │   Codex (Worker)    │
          │  - Sinh mã nguồn    │
          │  - Sửa lỗi code     │
          │  - Giải thích code  │
          └─────────────────────┘
```

| Vai trò       | Mô hình            | Trách nhiệm                                           |
|---------------|--------------------|-------------------------------------------------------|
| Supervisor    | Claude (Anthropic) | Hiểu ngữ cảnh, lập kế hoạch, review & tổng hợp kết quả |
| Worker / Task | OpenAI Codex       | Viết code, refactor, debug, giải thích đoạn mã        |

---

## Tính năng chính

- **Phân tích yêu cầu thông minh** – Claude đọc hiểu yêu cầu bằng ngôn ngữ tự nhiên và chuyển thành các task rõ ràng.
- **Thực thi code chuyên sâu** – Codex nhận từng task và trả về code hoàn chỉnh, có giải thích.
- **Review & hợp nhất** – Claude kiểm tra kết quả từ Codex, bổ sung ngữ cảnh và trả lời cuối cho người dùng.
- **Linh hoạt mở rộng** – Dễ dàng thêm các worker model khác (GPT-4, Gemini, v.v.) vào hệ thống.

---

## Luồng hoạt động

1. Người dùng gửi yêu cầu (ví dụ: *"Viết API CRUD bằng FastAPI"*).
2. **Claude** phân tích, tạo plan và chia thành các sub-task (e.g. *"Tạo model", "Viết route", "Thêm validation"*).
3. Từng sub-task được gửi tới **Codex** để sinh code.
4. **Claude** nhận lại output, review, tổng hợp và trả kết quả hoàn chỉnh cho người dùng.

---

## Yêu cầu hệ thống

- Python ≥ 3.10
- API key của **Anthropic Claude** (`ANTHROPIC_API_KEY`)
- API key của **OpenAI Codex** (`OPENAI_API_KEY`)

---

## Cài đặt & Chạy

```bash
# Clone dự án
git clone https://github.com/nhatha240/multi-model-Collaboration.git
cd multi-model-Collaboration

# Cài dependencies
pip install -r requirements.txt

# Thiết lập biến môi trường
export ANTHROPIC_API_KEY="your-anthropic-key"
export OPENAI_API_KEY="your-openai-key"

# Khởi động
python main.py
```

---

## Cấu trúc thư mục (dự kiến)

```
multi-model-Collaboration/
├── main.py              # Entrypoint
├── supervisor/          # Logic của Claude supervisor
│   └── coordinator.py
├── workers/             # Các worker model
│   └── codex_worker.py
├── utils/               # Tiện ích chung
└── requirements.txt
```

---

## Giấy phép

Dự án được phát hành theo giấy phép [MIT](LICENSE).
