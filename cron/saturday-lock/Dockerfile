FROM alpine:latest
RUN apk add --no-cache curl
WORKDIR /app
COPY saturday-lock.sh .
CMD ["sh", "saturday-lock.sh"]
