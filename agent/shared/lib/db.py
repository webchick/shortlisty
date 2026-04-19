"""Supabase client. Uses Secret key to bypass row-level security."""

from functools import cache

from supabase import Client, create_client

from shared.lib.settings import settings


@cache
def get_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_secret_key)
