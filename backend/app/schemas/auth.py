from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SetupStatus(BaseModel):
    setup_required: bool


class AdminSetupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=12, max_length=256)
    base_currency: str = Field(default="HKD", min_length=3, max_length=3)
    timezone: str = Field(default="Asia/Hong_Kong", min_length=1, max_length=80)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Username cannot be blank")
        return normalized

    @field_validator("base_currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12, max_length=256)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str


class AuthResponse(BaseModel):
    user: UserResponse
    csrf_token: str
