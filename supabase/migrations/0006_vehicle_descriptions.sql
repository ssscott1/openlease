-- Car detail pages: a CRM-editable long description per vehicle.
alter table public.vehicles
  add column if not exists long_description text not null default '';

update public.vehicles set long_description = 'The Corolla Cross Hybrid pairs Toyota''s proven hybrid system with a high-riding compact SUV body — easy to park in the city, comfortable on the motorway, and remarkably cheap to fuel at around 4.4 L/100km. Inside you get a modern touchscreen with wireless Apple CarPlay and Android Auto, a full suite of Toyota Safety Sense driver assistance, and a boot that swallows a weekly shop or two carry-ons. The sensible choice for singles and couples settling into Australian life.'
where slug = 'corolla-cross-hybrid' and long_description = '';

update public.vehicles set long_description = 'Australia''s favourite commuter sedan, in its most efficient form. The Camry Hybrid glides through traffic on electric power, stretches a tank past 1,000 km, and keeps you comfortable with a spacious, quiet cabin and supportive seats for long freeway runs. Toyota Safety Sense is standard, servicing is simple, and the drive is effortlessly smooth — the professional''s pick for daily commuting.'
where slug = 'camry-hybrid' and long_description = '';

update public.vehicles set long_description = 'The RAV4 Hybrid is the family all-rounder for a reason: a big boot, generous rear legroom, a high seating position and real-world economy around 4.7 L/100km. Weekend trips are easy with roof rails and all the storage a family needs, while Toyota Safety Sense, adaptive cruise and a reversing camera take the stress out of unfamiliar roads. If you''re arriving with kids, start here.'
where slug = 'rav4-hybrid' and long_description = '';

update public.vehicles set long_description = 'Australia''s best-selling workhorse. The HiLux SR5 4x4 brings a turbo-diesel engine, genuine off-road ability and a tub ready for tools, gear or weekend toys. Inside it''s more comfortable than you''d expect — touchscreen, smartphone mirroring and a full safety suite — while the legendary reliability means it just keeps working, on site through the week or off the bitumen on Saturday.'
where slug = 'hilux-sr5' and long_description = '';

update public.vehicles set long_description = 'Seven seats without compromise. The Kluger Hybrid moves the whole family — plus luggage — in quiet, air-conditioned comfort, with three rows of real seats and a hybrid system that keeps fuel bills sensible for a car this size. A power tailgate, tri-zone climate control and Toyota''s full safety suite are all included. The premium pick for bigger families getting settled.'
where slug = 'kluger-hybrid' and long_description = '';
