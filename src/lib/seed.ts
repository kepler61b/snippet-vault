import prisma from "./db";
import { hashPassword } from "./auth";

export async function ensureSeedSnippets() {
  // Ensure default demo user exists
  const userCount = await prisma.user.count();
  let defaultUserId: string | undefined = undefined;

  if (userCount === 0) {
    const defaultUser = await prisma.user.create({
      data: {
        email: "admin@snippetvault.local",
        passwordHash: hashPassword("admin12345"),
        name: "Admin",
        bio: "Главный администратор SnippetVault",
      },
    });
    defaultUserId = defaultUser.id;
  } else {
    const firstUser = await prisma.user.findFirst({ select: { id: true } });
    defaultUserId = firstUser?.id;
  }

  const count = await prisma.snippet.count();
  if (count > 0) return;

  await prisma.snippet.create({
    data: {
      title: "React 19: Хук useDebounce с поддержкой отмены",
      description: "Универсальный TypeScript хук для дебаунса ввода пользователя в поисковых строках и формах.",
      visibility: "PUBLIC",
      isFavorite: true,
      tags: "react, typescript, hooks, frontend",
      userId: defaultUserId,
      files: {
        create: [
          {
            filename: "useDebounce.ts",
            language: "typescript",
            order: 0,
            content: `import { useEffect, useState } from "react";

/**
 * Хук для отложенного обновления значения (debounce).
 * Идеально подходит для автокомплита и поисковых полей.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}`,
          },
          {
            filename: "SearchBarExample.tsx",
            language: "typescript",
            order: 1,
            content: `"use client";

import React, { useState, useEffect } from "react";
import { useDebounce } from "./useDebounce";

export function SearchBar() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);

  useEffect(() => {
    if (debouncedSearch) {
      console.log("Отправка запроса к API для:", debouncedSearch);
      // fetch(\`/api/search?q=\${encodeURIComponent(debouncedSearch)}\`);
    }
  }, [debouncedSearch]);

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Введите поисковый запрос..."
      className="p-2 border rounded"
    />
  );
}`,
          },
        ],
      },
    },
  });

  await prisma.snippet.create({
    data: {
      title: "Python FastAPI: JWT Авторизация с Bearer Token",
      description: "Готовый модуль для аутентификации пользователей через JWT токен в FastAPI с Dependency Injection.",
      visibility: "PUBLIC",
      isFavorite: true,
      tags: "python, fastapi, jwt, backend, security",
      userId: defaultUserId,
      files: {
        create: [
          {
            filename: "auth.py",
            language: "python",
            order: 0,
            content: `from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

SECRET_KEY = "your-ultra-secure-random-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class TokenData(BaseModel):
    username: Optional[str] = None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось верифицировать учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return TokenData(username=username)
    except JWTError:
        raise credentials_exception`,
          },
        ],
      },
    },
  });

  await prisma.snippet.create({
    data: {
      title: "Docker Compose: Стек PostgreSQL 16 + Adminer + Persistent Volume",
      description: "Конфигурация docker-compose для локальной разработки с базой данных PostgreSQL и веб-клиентом Adminer.",
      visibility: "PUBLIC",
      isFavorite: false,
      tags: "docker, postgresql, devops, database",
      userId: defaultUserId,
      files: {
        create: [
          {
            filename: "docker-compose.yml",
            language: "yaml",
            order: 0,
            content: `version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: dev_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: app_secure_password
      POSTGRES_DB: app_database
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app_user -d app_database"]
      interval: 10s
      timeout: 5s
      retries: 5

  adminer:
    image: adminer:latest
    container_name: dev_adminer
    restart: unless-stopped
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
    driver: local`,
          },
        ],
      },
    },
  });
}
