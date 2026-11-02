# 第 8 课资料来源

课件核心内容离线可用。以下链接用于教师备课、讲师备注和课后继续查阅；真实版本、命令、配置与安全要求应以对应官方文档为准。

## 网络地址与协议

- [RFC 791：Internet Protocol](https://www.rfc-editor.org/info/rfc791/) — IPv4 地址为四个八位组，也就是 32 位。
- [RFC 8200：IPv6 Specification](https://www.rfc-editor.org/info/rfc8200/) — IPv6 将地址长度从 32 位扩展到 128 位。
- [RFC 1918：Address Allocation for Private Internets](https://www.rfc-editor.org/info/rfc1918/) — IPv4 私网地址段：`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`。
- [RFC 6598：Shared Address Space](https://www.rfc-editor.org/info/rfc6598/) — 为运营商 CGN 部署保留 `100.64.0.0/10` 共享地址空间。
- [RFC 6269：Issues with IP Address Sharing](https://www.rfc-editor.org/info/rfc6269/) — 讨论多个订户共享公网 IPv4 对应用和入站连接造成的影响。
- [RFC 3022：Traditional IP Network Address Translator](https://www.rfc-editor.org/info/rfc3022/) — 传统 NAT 的基本模型。
- [RFC 5737：IPv4 Address Blocks Reserved for Documentation](https://www.rfc-editor.org/info/rfc5737/) — `203.0.113.0/24` 等文档示例地址段。
- [IANA Service Name and Transport Protocol Port Number Registry](https://www.iana.org/assignments/service-names-port-numbers/) — SSH、HTTP、HTTPS 等服务名与常见端口注册信息。

## SSH

- [OpenBSD ssh-keygen(1)](https://man.openbsd.org/ssh-keygen.1) — SSH 密钥生成、指纹与密钥管理。
- [OpenBSD sshd(8)](https://man.openbsd.org/sshd.8) — 公钥认证与 `authorized_keys` 文件格式。
- [OpenBSD sshd_config(5)](https://man.openbsd.org/sshd_config) — SSH 服务端认证方式与配置选项。

## 操作系统

- [Apple Kernel Architecture Overview](https://developer.apple.com/library/archive/documentation/Darwin/Conceptual/KernelProgramming/Architecture/Architecture.html) — Darwin、Mach、BSD 与 OS X/macOS 核心架构关系，用于订正“macOS 是 Linux 分支”的误解。

## 容器、代理与 Java 应用服务器

- [Docker：What is a container?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/) — 容器与镜像的基础概念。
- [Docker：What is Docker Compose?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-docker-compose/) — Compose 对多容器、网络和数据卷的声明式管理。
- [Docker Compose Quickstart](https://docs.docker.com/compose/gettingstarted/) — 多服务示例、健康检查和持久化注意事项。
- [Nginx Beginner’s Guide](https://nginx.org/en/docs/beginners_guide.html) — 静态内容、代理服务、配置检查与重新加载。
- [Apache Tomcat Documentation](https://tomcat.apache.org/tomcat-11.0-doc/) — Tomcat 作为 Servlet/JSP 容器的官方文档。
- [Spring Boot：Running Your Application](https://docs.spring.io/spring-boot/reference/using/running-your-application.html) — 可执行 JAR、内置 HTTP 服务器与 `java -jar` 运行方式。
- [Spring Boot：Executable Jar Format](https://docs.spring.io/spring-boot/specification/executable-jar/) — Spring Boot 可执行 JAR/WAR 格式。
- [systemd.service](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html) — systemd 服务单元的官方手册。

## 视觉与图标

- 课件的比较表、网络路径、服务器层级与交互控件均使用本地 HTML/CSS/JavaScript 实现。
- 未使用外部图片、远程字体、第三方图标库或 CDN。
