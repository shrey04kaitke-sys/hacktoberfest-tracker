function getMonthRange(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error("Choose a valid month.");
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) throw new Error("Choose a valid month.");
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    start: `${year}-${String(monthNumber).padStart(2, "0")}-01`,
    end: `${year}-${String(monthNumber).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  };
}

function getPullRequestState(pr) {
  if (pr.pull_request && pr.pull_request.merged_at) return "merged";
  if (pr.state === "open") return "open";
  return "closed";
}

function countPullRequests(items) {
  return items.reduce((counts, pr) => {
    counts[getPullRequestState(pr)] += 1;
    return counts;
  }, { merged: 0, open: 0, closed: 0 });
}

function getProgressMessage(count, goal) {
  const completed = count.merged + count.open;
  if (completed >= goal) return "Goal reached! Nice work.";
  if (completed === 0) return "No PRs yet. Your first contribution is waiting!";
  return `${goal - completed} more to go. Keep it up!`;
}

if (typeof document !== "undefined") {
const form = document.getElementById("progress-form");
const usernameInput = document.getElementById("username");
const monthInput = document.getElementById("month");
const goalInput = document.getElementById("goal");
const submitButton = document.getElementById("submit-button");
const errorMessage = document.getElementById("error");
const results = document.getElementById("results");
const progressCount = document.getElementById("progress-count");
const progressPercent = document.getElementById("progress-percent");
const progressBar = document.getElementById("progress-bar");
const progressTrack = document.querySelector(".progress-track");
const friendlyMessage = document.getElementById("friendly-message");
const prList = document.getElementById("pr-list");

function setDefaultValues() {
  const current = new Date();
  monthInput.value = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
  try {
    usernameInput.value = localStorage.getItem("hacktoberfest-username") || "";
    goalInput.value = localStorage.getItem("hacktoberfest-goal") || "6";
  } catch (error) {
    // Storage can be unavailable in private browsing.
  }
}

function savePreferences(username, goal) {
  try {
    localStorage.setItem("hacktoberfest-username", username);
    localStorage.setItem("hacktoberfest-goal", String(goal));
  } catch (error) {
    // The tracker still works without storage.
  }
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  results.hidden = true;
}

function renderPullRequests(items) {
  prList.textContent = "";
  items.forEach((pr) => {
    const state = getPullRequestState(pr);
    const item = document.createElement("li");
    item.className = "pr-item";
    const link = document.createElement("a");
    link.href = pr.html_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const title = document.createElement("span");
    title.className = "pr-title";
    const titleText = document.createElement("strong");
    titleText.textContent = pr.title || "Untitled pull request";
    const repo = document.createElement("small");
    repo.textContent = pr.repository_url ? pr.repository_url.replace("https://api.github.com/repos/", "") : "Unknown repository";
    title.append(titleText, repo);
    const badge = document.createElement("span");
    badge.className = `badge badge-${state}`;
    badge.textContent = state[0].toUpperCase() + state.slice(1);
    link.append(title, badge);
    item.append(link);
    prList.append(item);
  });
}

function renderResults(items, goal) {
  const count = countPullRequests(items);
  const completed = count.merged + count.open;
  const percent = Math.min(100, Math.round((completed / goal) * 100));
  progressCount.textContent = `${completed} / ${goal} pull requests`;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  progressTrack.setAttribute("aria-valuenow", String(percent));
  document.getElementById("merged-count").textContent = count.merged;
  document.getElementById("open-count").textContent = count.open;
  document.getElementById("closed-count").textContent = count.closed;
  friendlyMessage.textContent = getProgressMessage(count, goal);
  renderPullRequests(items);
  results.hidden = false;
}

async function checkProgress(username, month, goal) {
  const range = getMonthRange(month);
  const query = `author:${username} type:pr created:${range.start}..${range.end}`;
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=100&sort=created&order=desc`;
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) throw new Error("GitHub's rate limit was reached. Please try again later.");
    if (response.status === 422) throw new Error("That GitHub username could not be found. Please check it and try again.");
    throw new Error("GitHub could not load the pull requests. Please try again.");
  }
  const data = await response.json();
  renderResults(data.items || [], goal);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const goal = Number(goalInput.value);
  errorMessage.hidden = true;
  submitButton.disabled = true;
  submitButton.textContent = "Checking...";
  savePreferences(username, goal);
  try {
    await checkProgress(username, monthInput.value, goal);
  } catch (error) {
    showError(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Check progress";
  }
});

setDefaultValues();
}

if (typeof module !== "undefined") {
  module.exports = { getMonthRange, getPullRequestState, countPullRequests, getProgressMessage };
}
