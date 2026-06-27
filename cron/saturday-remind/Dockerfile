FROM alpine:latest
RUN apk add --no-cache curl
WORKDIR /app
COPY saturday-remind.sh .
CMD ["sh", "saturday-remind.sh"]
