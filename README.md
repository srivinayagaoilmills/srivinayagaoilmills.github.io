# Sri Vinayaga Oil & Flour Mills: website

A static site (no build step). `index.html` is the shop, `admin/` is the admin panel. Both talk to the Supabase project in `js/config.js`.

## Put it online (any one of these, about 5 minutes)
- **Cloudflare Pages / Netlify / Vercel**: create a project, upload or drag this whole folder, no build command, publish directory is the folder itself.
- Then in Supabase: Authentication > URL Configuration > Site URL = your live address.
- Point your domain at it from the host's Domains page.

## Admin panel
Open `/admin/` on your site. Sign in with `laxmann.2003@gmail.com`.
- Owner: everything. Staff: orders, customers, enquiries, reviews. Editor: products, prices, combos, offers, banners.
- To add a team member: they create a normal account on the shop (mobile number + password), then Team > search > choose a role.

## Things to know
- Customers sign in with mobile number + password. There is no SMS, so a forgotten password is reset by the owner in Supabase (Authentication > Users). Add an SMS provider later to automate this.
- Supabase Authentication > Providers > Email: "Confirm email" must be OFF.
- Points are added when an order is marked Delivered (change in Settings). Redeemed points are deducted when the order is placed and returned if it is cancelled.
- All prices are Rs 999 placeholders until you change them in Products and prices.
- Photos: upload in the admin panel (stored in Supabase). Built-in site photos are in `assets/`.

## Folders
`css/ js/ fonts/ assets/` are the site files. `js/vendor/supabase.min.js` is the Supabase library, kept here so the site does not depend on a CDN.
