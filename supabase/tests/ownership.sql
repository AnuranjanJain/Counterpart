-- Run against a disposable migrated Supabase database with psql -v ON_ERROR_STOP=1.
begin;
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner-a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'owner-b@example.test');
insert into public.reviews(id, owner_id, data) values
  ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$
begin
  if (select count(*) from public.reviews) <> 0 then raise exception 'FAIL: cross-owner read'; end if;
  if has_table_privilege(current_user,'public.reviews','INSERT') or has_table_privilege(current_user,'public.reviews','UPDATE') or has_table_privilege(current_user,'public.reviews','DELETE') then
    raise exception 'FAIL: browser write privileges';
  end if;
  if has_function_privilege(current_user,'public.claim_generation(uuid,uuid,text,text,integer)','EXECUTE') or has_function_privilege(current_user,'public.finish_generation(uuid,uuid,jsonb,boolean)','EXECUTE') then
    raise exception 'FAIL: browser generation privileges';
  end if;
  begin
    perform public.finish_generation('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','{"forged":true}');
    raise exception 'FAIL: fabricated result accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$
begin
  if (select count(*) from public.reviews) <> 1 then raise exception 'FAIL: owner cannot read'; end if;
  begin
    update public.reviews set data='{"analysis":"forged"}' where id='33333333-3333-4333-8333-333333333333';
    raise exception 'FAIL: owner bypassed server validation';
  exception when insufficient_privilege then null;
  end;
end $$;
set local role service_role;
do $$
declare claim jsonb; cached jsonb; actor uuid := '11111111-1111-4111-8111-111111111111';
begin
  begin
    perform public.claim_generation('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',repeat('a',64),'analysis',30);
    raise exception 'FAIL: generation owner mismatch';
  exception when raise_exception then
    if sqlerrm <> 'NOT_FOUND' then raise; end if;
  end;
  claim := public.claim_generation(actor,'33333333-3333-4333-8333-333333333333',repeat('a',64),'analysis',30);
  begin
    perform public.finish_generation('22222222-2222-4222-8222-222222222222',(claim->>'ticket')::uuid,'{}');
    raise exception 'FAIL: completion owner mismatch';
  exception when raise_exception then
    if sqlerrm <> 'NOT_FOUND' then raise; end if;
  end;
  begin
    perform public.claim_generation(actor,'33333333-3333-4333-8333-333333333333',repeat('b',64),'analysis',30);
    raise exception 'FAIL: concurrent admission';
  exception when raise_exception then
    if sqlerrm <> 'GENERATION_BUSY' then raise; end if;
  end;
  perform public.finish_generation(actor,(claim->>'ticket')::uuid,'{"verified":true}');
  cached := public.claim_generation(actor,'33333333-3333-4333-8333-333333333333',repeat('a',64),'analysis',30);
  if cached->>'cached' <> 'true' then raise exception 'FAIL: idempotency'; end if;
  for i in 2..3 loop
    claim := public.claim_generation(actor,'33333333-3333-4333-8333-333333333333',repeat(i::text,64),'analysis',30);
    perform public.finish_generation(actor,(claim->>'ticket')::uuid,'{}');
  end loop;
end $$;
delete from public.reviews where id='33333333-3333-4333-8333-333333333333' and owner_id='11111111-1111-4111-8111-111111111111';
insert into public.reviews(id,owner_id,data) values('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','{}');
do $$
begin
  begin
    perform public.claim_generation('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',repeat('c',64),'analysis',30);
    raise exception 'FAIL: quota reset through deletion';
  exception when raise_exception then
    if sqlerrm <> 'USER_QUOTA' then raise; end if;
  end;
end $$;
rollback;
