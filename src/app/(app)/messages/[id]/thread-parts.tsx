"use client";

import { useActionState, useEffect } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";

import { TextAreaField } from "../../_components/form-fields";
import { markMessageRead, reply } from "../actions";
import { messageIdleState } from "../form-state";

/**
 * Marks the message read once it is actually on screen.
 *
 * An effect rather than a write during render: a page render can be a
 * prefetch, and a message somebody only hovered past is not one they read.
 */
export function MarkRead({ messageId }: { messageId: string }) {
  useEffect(() => {
    void markMessageRead(messageId);
  }, [messageId]);

  return null;
}

/**
 * Add to one private thread. `threadUserId` is only a request — the server
 * puts a recipient's reply in their own thread whatever it says.
 */
export function ReplyForm({
  messageId,
  threadUserId,
  to,
}: {
  messageId: string;
  threadUserId?: string;
  to: string;
}) {
  const [state, action] = useActionState(reply.bind(null, messageId), messageIdleState);
  const field = threadUserId ? `body-${threadUserId}` : "body";

  return (
    <form key={state.attempt ?? "empty"} action={action} className="grid gap-3" noValidate>
      <FormError>{state.error}</FormError>
      {threadUserId && <input type="hidden" name="threadUserId" value={threadUserId} />}
      <TextAreaField
        id={field}
        name="body"
        label={`Reply to ${to}`}
        rows={3}
        defaultValue={state.done ? "" : state.values?.body}
        error={state.fieldErrors?.body}
        hint={`Only you and ${to} see this conversation.`}
      />
      <div className="sm:max-w-[12rem]">
        <Submit pendingLabel="Sending…">Send reply</Submit>
      </div>
    </form>
  );
}
