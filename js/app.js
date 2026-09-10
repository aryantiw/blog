const filters = [...document.querySelectorAll('.filter')];
const posts = [...document.querySelectorAll('.post')];

filters.forEach((filter) => filter.addEventListener('click', () => {
  filter.classList.toggle('selected');
  const active = filters.filter((item) => item.classList.contains('selected')).map((item) => item.dataset.category);
  posts.forEach((post) => {
    const category = post.querySelector('.category')?.textContent;
    post.hidden = active.length > 0 && !active.includes(category);
  });
}));
