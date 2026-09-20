-- Allow the mentee's private 1:1 link to mark visible tasks complete.
-- The token is resolved to one active portal and the public caller can only
-- toggle a task between todo and done; all other task fields remain admin-only.

begin;

create or replace function public.update_one_to_one_task_status(
  p_token text,
  p_task_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_portal_id uuid;
  v_task public.one_to_one_tasks%rowtype;
begin
  if p_token is null or char_length(trim(p_token)) < 48 or char_length(trim(p_token)) > 128 then
    return null;
  end if;

  if p_status is null or p_status not in ('todo', 'done') then
    raise exception using errcode = '22023', message = 'INVALID_TASK_STATUS';
  end if;

  select portal.id
  into v_portal_id
  from public.one_to_one_portals as portal
  where portal.public_token_hash = private.hash_one_to_one_token(trim(p_token))
    and portal.is_active = true;

  if not found then return null; end if;

  update public.one_to_one_tasks
  set status = p_status,
      updated_at = now()
  where id = p_task_id
    and portal_id = v_portal_id
    and is_visible = true
  returning * into v_task;

  if not found then return null; end if;

  return jsonb_build_object(
    'id', v_task.id,
    'status', v_task.status,
    'updatedAt', v_task.updated_at
  );
end;
$$;

revoke all on function public.update_one_to_one_task_status(text, uuid, text) from public, anon, authenticated;
grant execute on function public.update_one_to_one_task_status(text, uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
