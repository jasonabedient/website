import os
import re

files_root = ['index.html', 'about.html', 'contact.html', 'leadership.html']
files_design = ['design/index.html', 'design/case-study-template.html', 'design/prism-design-system.html']
files_blog = ['blog/index.html', 'blog/post-template.html', 'blog/five-principles-impactful-leadership.html']

nav_template = """            <nav class="main-nav">
                <a href="{href_design}"{cls_design}>Design</a>
                <a href="{href_leadership}"{cls_leadership}>Leadership</a>
                <a href="{href_about}"{cls_about}>About</a>
                <a href="{href_blog}"{cls_blog}>Blog</a>
                <a href="{href_contact}" class="btn btn-outline">Let's Talk</a>
            </nav>"""

def replace_nav(file_path, depth_type, active_file_name_if_any=None):
    if depth_type == 'root':
        href_design = 'design/index.html'
        href_leadership = 'leadership.html'
        href_about = 'about.html'
        href_blog = 'blog/index.html'
        href_contact = 'contact.html'
    else:
        href_design = 'index.html' if depth_type == 'design' else '../design/index.html'
        href_leadership = '../leadership.html'
        href_about = '../about.html'
        href_blog = 'index.html' if depth_type == 'blog' else '../blog/index.html'
        href_contact = '../contact.html'
        
    cls_design = ' class="active"' if active_file_name_if_any == 'design' else ''
    cls_leadership = ' class="active"' if active_file_name_if_any == 'leadership' else ''
    cls_about = ' class="active"' if active_file_name_if_any == 'about' else ''
    cls_blog = ' class="active"' if active_file_name_if_any == 'blog' else ''
    
    new_nav = nav_template.format(
        href_design=href_design, cls_design=cls_design,
        href_leadership=href_leadership, cls_leadership=cls_leadership,
        href_about=href_about, cls_about=cls_about,
        href_blog=href_blog, cls_blog=cls_blog,
        href_contact=href_contact
    )
    
    with open(file_path, 'r') as f:
        content = f.read()
        
    # use regex to replace standard <nav class="main-nav"> ... </nav>
    pattern = re.compile(r'[ \t]*<nav class="main-nav">.*?</nav>', re.DOTALL)
    new_content = pattern.sub(new_nav, content, count=1)
    
    with open(file_path, 'w') as f:
        f.write(new_content)

for f in files_root:
    active = None
    if f == 'about.html': active = 'about'
    if f == 'leadership.html': active = 'leadership'
    # contact isn't normally active
    replace_nav(f, 'root', active)

for f in files_design:
    replace_nav(f, 'design', 'design')

for f in files_blog:
    replace_nav(f, 'blog', 'blog')

print("Done updating navs")
