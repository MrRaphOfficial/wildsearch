const searchBtn=document.getElementById("searchBtn");

searchBtn.addEventListener("click",searchWildlife);

async function searchWildlife(){

const query=document.getElementById("searchInput").value;

const res=await fetch(
"https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages|extracts&exintro&explaintext&generator=search&gsrsearch="+query+"&gsrlimit=4&piprop=original"
);

const data=await res.json();

const pages=data.query.pages;

const results=document.getElementById("results");

results.innerHTML="";

Object.values(pages).forEach(page=>{

const img=page.original? page.original.source:"";

const card=document.createElement("div");
card.className="card";

card.innerHTML=`

<img loading="lazy" src="${img}">

<div class="cardContent">

<h2>${page.title}</h2>

<p>${page.extract.substring(0,200)}...</p>

<button>Read More</button>

</div>

`;

card.querySelector("button").addEventListener("click",()=>{

openModal(page,img);

});

results.appendChild(card);

});

}

/* MODAL */

const modal=document.getElementById("modal");
const modalImg=document.getElementById("modalImg");
const modalTitle=document.getElementById("modalTitle");
const modalText=document.getElementById("modalText");
const wikiLink=document.getElementById("wikiLink");

function openModal(page,img){

modal.style.display="flex";

modalImg.src=img;

modalTitle.textContent=page.title;

modalText.textContent=page.extract;

wikiLink.href="https://en.wikipedia.org/?curid="+page.pageid;

}

document.getElementById("closeModal").onclick=function(){

modal.style.display="none";

};