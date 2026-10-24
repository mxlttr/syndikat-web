<script>
  import { onMount } from "svelte";
  import { Trash2 } from "lucide-svelte";
  import { resolveApiUrl } from "../utils/api";

  const API_URL = resolveApiUrl();
  const SIGNUP_STORAGE_KEY = "training-signup";
  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  let status = null;
  let participants = [];
  let signup = null;
  let loadingStatus = true;
  let loadingParticipants = true;
  let submitting = false;
  let removingId = null;
  let statusError = "";
  let participantsError = "";
  let formError = "";
  let formMessage = "";
  let name = "";
  let password = "";

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
  }

  function readSavedSignup() {
    try {
      const value = window.localStorage.getItem(SIGNUP_STORAGE_KEY);
      if (!value) return null;
      const parsed = JSON.parse(value);
      return parsed?.id && parsed?.date && parsed?.removalToken ? parsed : null;
    } catch (error) {
      window.Sentry?.captureException(error);
      return null;
    }
  }

  async function readMessage(response, fallback) {
    try {
      const body = await response.json();
      return body?.message || fallback;
    } catch {
      return fallback;
    }
  }

  async function loadParticipants(signal) {
    if (!status?.date) return;

    loadingParticipants = true;
    participantsError = "";
    try {
      const response = await fetch(`${API_URL}/training/participants?date=${encodeURIComponent(status.date)}`, {
        credentials: "include",
        signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to load training participants: ${response.status}`);
      }

      const result = await response.json();
      if (!Array.isArray(result?.participants)) {
        throw new Error("Training participants response has an invalid shape");
      }
      participants = result.participants;
      signup = readSavedSignup();
    } catch (error) {
      if (error.name === "AbortError") return;
      window.Sentry?.captureException(error);
      console.error(error);
      participantsError = "Die Anmeldungen konnten gerade nicht geladen werden.";
    } finally {
      if (signal?.aborted) return;
      loadingParticipants = false;
    }
  }

  async function loadTraining(signal) {
    loadingStatus = true;
    statusError = "";
    try {
      const response = await fetch(`${API_URL}/training/status`, {
        credentials: "include",
        signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to load training status: ${response.status}`);
      }

      const result = await response.json();
      if (typeof result?.date !== "string" || typeof result?.signupOpen !== "boolean") {
        throw new Error("Training status response has an invalid shape");
      }
      status = result;
      await loadParticipants(signal);
    } catch (error) {
      if (error.name === "AbortError") return;
      window.Sentry?.captureException(error);
      console.error(error);
      statusError = "Der nächste Trainingstermin konnte gerade nicht geladen werden.";
    } finally {
      if (signal?.aborted) return;
      loadingStatus = false;
      if (!status) loadingParticipants = false;
    }
  }

  onMount(() => {
    const controller = new AbortController();
    signup = readSavedSignup();
    void loadTraining(controller.signal);

    return () => controller.abort();
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!status?.signupOpen || submitting) return;

    submitting = true;
    formError = "";
    formMessage = "";
    try {
      const response = await fetch(`${API_URL}/training/participants`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      if (!response.ok) {
        formError = await readMessage(response, "Anmeldung fehlgeschlagen.");
        return;
      }

      const result = await response.json();
      window.localStorage.setItem(
        SIGNUP_STORAGE_KEY,
        JSON.stringify({
          id: result.participant.id,
          date: result.participant.date,
          removalToken: result.removalToken,
        }),
      );
      signup = readSavedSignup();
      name = "";
      password = "";
      formMessage = "Du hast dich erfolgreich angemeldet.";
      await loadParticipants();
    } catch (error) {
      window.Sentry?.captureException(error);
      console.error(error);
      formError = "Die Anmeldung konnte gerade nicht gesendet werden. Bitte versuche es erneut.";
    } finally {
      submitting = false;
    }
  }

  async function handleDelete(participant) {
    const savedSignup = readSavedSignup();
    if (!savedSignup?.removalToken || savedSignup.id !== participant.id || removingId) return;

    removingId = participant.id;
    formError = "";
    formMessage = "";
    try {
      const response = await fetch(`${API_URL}/training/participants/${encodeURIComponent(participant.id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Authorization: `Bearer ${savedSignup.removalToken}` },
      });
      if (!response.ok) {
        formError = await readMessage(response, "Die Anmeldung konnte nicht entfernt werden.");
        return;
      }

      window.localStorage.removeItem(SIGNUP_STORAGE_KEY);
      signup = null;
      formMessage = "Deine Anmeldung wurde entfernt.";
      await loadParticipants();
    } catch (error) {
      window.Sentry?.captureException(error);
      console.error(error);
      formError = "Die Anmeldung konnte gerade nicht entfernt werden. Bitte versuche es erneut.";
    } finally {
      removingId = null;
    }
  }
</script>

<div class="training-signup">
  <p>
    <strong>Nächster Termin:</strong>
    {#if loadingStatus}
      Termin wird geladen …
    {:else if status}
      {formatDate(status.date)} um 16:00 Uhr
    {:else}
      derzeit nicht verfügbar
    {/if}
  </p>

  {#if statusError}<p role="alert">{statusError}</p>{/if}

  <h3>Für das nächste Training angemeldete Personen:</h3>
  {#if loadingStatus || loadingParticipants}
    <p role="status">Anmeldungen werden geladen …</p>
  {:else if !statusError && participantsError}
    <p role="alert">{participantsError}</p>
    <button class="button button--text" type="button" on:click={() => loadParticipants()}> Erneut laden </button>
  {:else if !statusError && participants.length}
    <ol data-training-list>
      {#each participants as participant (participant.id)}
        <li>
          {participant.name}
          {#if signup?.id === participant.id && signup?.date === status?.date}
            <button
              class="button button--text"
              type="button"
              aria-label={`Anmeldung für ${participant.name} entfernen`}
              title="Anmeldung entfernen"
              disabled={removingId === participant.id}
              on:click={() => handleDelete(participant)}
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          {/if}
        </li>
      {/each}
    </ol>
  {:else if !statusError}
    <ol data-training-list>
      <li><em>Bisher noch keine Anmeldungen. Sei der/die erste!</em></li>
    </ol>
  {/if}

  <h2>Jetzt anmelden</h2>
  <p>
    Bitte melde dich immer zum nächsten Termin über dieses Formular an. Das sorgt für eine bessere Planbarkeit unserer
    Trainings. Die Anmeldung zum nächsten Termin ist immer ab Samstag möglich.
  </p>
  <p>
    <em>
      Hinweise: Es reicht, wenn du deinen Vor- oder Spitznamen einträgst. Das Passwort bekommst du auf dem <a
        href="https://community.syndikat.golf"
        target="_blank"
        rel="noopener noreferrer">Syndikat-Discord</a
      >
      oder von einem unserer Mitglieder.
    </em>
  </p>

  {#if status && !status.signupOpen}
    <p><em>Die Anmeldung für das nächste Training öffnet am Samstag.</em></p>
  {/if}

  {#if formError}<p role="alert">{formError}</p>{/if}
  {#if formMessage}<p role="status">{formMessage}</p>{/if}

  <form data-training-form class="search__group" on:submit={handleSubmit}>
    <label class="screen-reader-text" for="training-name">Dein Name</label>
    <input
      class="search__text"
      id="training-name"
      type="text"
      name="name"
      placeholder="Birdie Bernd"
      maxlength="40"
      autocomplete="name"
      required
      bind:value={name}
    />
    <label class="screen-reader-text" for="training-password">Passwort</label>
    <input
      class="search__text"
      id="training-password"
      type="password"
      name="password"
      placeholder="Passwort"
      autocomplete="off"
      required
      bind:value={password}
    />
    <button type="submit" class="button button--primary" disabled={!status?.signupOpen || submitting || loadingStatus}>
      {submitting ? "Wird angemeldet …" : "Anmelden"}
    </button>
  </form>
</div>
