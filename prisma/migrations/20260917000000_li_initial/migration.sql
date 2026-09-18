-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'LAWYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LawyerRank" AS ENUM ('PARTNER', 'ASSOCIATE');

-- CreateEnum
CREATE TYPE "MatterStatus" AS ENUM ('ACTIVE', 'CONCLUDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MatterStage" AS ENUM ('INITIAL_REVIEW', 'ANALYSIS', 'STRATEGY_DEFINED', 'NEGOTIATION', 'IN_PROGRESS', 'PENDING_AUTHORITY', 'PENDING_CLIENT', 'RESOLUTION', 'CONCLUDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MatterAssignmentRole" AS ENUM ('LEAD', 'LEAD_LAWYER', 'COLLABORATOR', 'REVIEWER', 'SUPERVISING_PARTNER');

-- CreateEnum
CREATE TYPE "MatterPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('CLIENT', 'INTERNAL', 'CLIENT_VISIBLE', 'INTERNAL_ONLY');

-- CreateEnum
CREATE TYPE "AppointmentModality" AS ENUM ('IN_PERSON', 'VIDEO_CALL', 'PHONE_CALL');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'LAWYER_REVIEW', 'CLIENT_REVIEW', 'PROPOSED_BY_LAWYER', 'PROPOSED_BY_CLIENT', 'CONFIRMED', 'DECLINED', 'RESCHEDULE_REQUESTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'PENDING_SYNC');

-- CreateEnum
CREATE TYPE "AppointmentProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'SUPERSEDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AppointmentProposalSide" AS ENUM ('CLIENT', 'FIRM');

-- CreateEnum
CREATE TYPE "AppointmentHoldStatus" AS ENUM ('ACTIVE', 'CONFIRMED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CalendarSyncStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SYNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "AppointmentChangeType" AS ENUM ('CANCEL', 'RESCHEDULE');

-- CreateEnum
CREATE TYPE "AppointmentChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'IN_REVIEW', 'RESOLVED', 'SPAM', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ArticleReviewDecision" AS ENUM ('SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ArticleBlockType" AS ENUM ('HEADING_2', 'HEADING_3', 'PARAGRAPH', 'LIST', 'QUOTE', 'CALLOUT', 'IMAGE', 'DIVIDER', 'TABLE', 'LINK', 'NOTE', 'CONCLUSION');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PUBLIC_IMAGE', 'PUBLIC_PDF', 'VIDEO_EMBED', 'ARTICLE_HERO', 'ARTICLE_INLINE', 'LAWYER_PROFILE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PROCESSING', 'READY', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentScanStatus" AS ENUM ('PENDING', 'CLEAN', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MATTER_UPDATE', 'MESSAGE', 'NEW_MESSAGE', 'DOCUMENT', 'APPOINTMENT', 'APPOINTMENT_REQUEST', 'APPOINTMENT_PROPOSAL', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'ARTICLE_SUBMITTED', 'ARTICLE_CHANGES_REQUESTED', 'ARTICLE_APPROVED', 'ARTICLE_PUBLISHED', 'ACCOUNT_INVITE', 'EMAIL_FAILED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('PASSWORD_RESET', 'ACCOUNT_INVITE');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTER', 'MOCKED');

-- CreateEnum
CREATE TYPE "CaseStudyStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CaseStudyVisibility" AS ENUM ('PUBLIC', 'ANONYMIZED', 'INTERNAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecretEncrypted" TEXT,
    "mfaPendingEncrypted" TEXT,
    "mfaEnrolledAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaRecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "notesInternal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeArea" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "servicesJson" JSONB NOT NULL,
    "faqsJson" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawyerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "rank" "LawyerRank" NOT NULL DEFAULT 'ASSOCIATE',
    "phone" TEXT,
    "bio" TEXT NOT NULL,
    "education" TEXT NOT NULL,
    "image" TEXT,
    "imageAlt" TEXT,
    "photoId" TEXT,
    "shortBio" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "emailPublic" TEXT,
    "linkedInUrl" TEXT,
    "supervisorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LawyerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawyerPracticeArea" (
    "lawyerId" TEXT NOT NULL,
    "practiceAreaId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LawyerPracticeArea_pkey" PRIMARY KEY ("lawyerId","practiceAreaId")
);

-- CreateTable
CREATE TABLE "Matter" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "descriptionPublic" TEXT,
    "descriptionInternal" TEXT,
    "status" "MatterStatus" NOT NULL DEFAULT 'ACTIVE',
    "stage" "MatterStage" NOT NULL DEFAULT 'INITIAL_REVIEW',
    "clientId" TEXT NOT NULL,
    "practiceAreaId" TEXT,
    "priority" "MatterPriority" NOT NULL DEFAULT 'NORMAL',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "nextActionPublic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Matter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterAssignment" (
    "matterId" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "role" "MatterAssignmentRole" NOT NULL DEFAULT 'COLLABORATOR',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterAssignment_pkey" PRIMARY KEY ("matterId","lawyerId")
);

-- CreateTable
CREATE TABLE "MatterUpdate" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'CLIENT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relatedStage" "MatterStage",
    "nextAction" TEXT,
    "nextActionAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "emailOutboxId" TEXT,

    CONSTRAINT "MatterUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterStageHistory" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "fromStage" "MatterStage",
    "toStage" "MatterStage" NOT NULL,
    "note" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'CLIENT',
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT,
    "matterId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "company" TEXT,
    "practiceAreaId" TEXT NOT NULL,
    "lawyerId" TEXT,
    "modality" "AppointmentModality" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "proposedStartAt" TIMESTAMP(3),
    "proposedEndAt" TIMESTAMP(3),
    "confirmedStartAt" TIMESTAMP(3),
    "confirmedEndAt" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "description" TEXT NOT NULL,
    "location" TEXT,
    "meetingUrl" TEXT,
    "visibleNotes" TEXT,
    "privacyAcceptedAt" TIMESTAMP(3) NOT NULL,
    "manageTokenHash" TEXT NOT NULL,
    "manageTokenExpiresAt" TIMESTAMP(3),
    "externalEventId" TEXT,
    "calendarSyncStatus" "CalendarSyncStatus" NOT NULL DEFAULT 'PENDING',
    "calendarSyncError" TEXT,
    "calendarSyncAttempts" INTEGER NOT NULL DEFAULT 0,
    "calendarSyncLockedAt" TIMESTAMP(3),
    "calendarSyncLockedBy" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT,
    "lastActorId" TEXT,
    "acceptedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "icsUid" TEXT NOT NULL,
    "icsSequence" INTEGER NOT NULL DEFAULT 0,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentProposal" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "proposedById" TEXT,
    "proposerSide" "AppointmentProposalSide" NOT NULL,
    "lawyerId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "modality" "AppointmentModality" NOT NULL,
    "location" TEXT,
    "meetingUrl" TEXT,
    "message" TEXT,
    "status" "AppointmentProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "AppointmentProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentHold" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "proposalId" TEXT,
    "lawyerId" TEXT,
    "resourceKey" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentReservationSlot" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "resourceKey" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentReservationSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentChangeRequest" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "type" "AppointmentChangeType" NOT NULL,
    "requestedStartAt" TIMESTAMP(3),
    "reason" TEXT,
    "status" "AppointmentChangeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AppointmentChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRule" (
    "id" TEXT NOT NULL,
    "lawyerId" TEXT,
    "weekday" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
    "minimumNoticeMinutes" INTEGER NOT NULL DEFAULT 1440,
    "bookingHorizonDays" INTEGER NOT NULL DEFAULT 60,
    "modalities" "AppointmentModality"[] DEFAULT ARRAY['IN_PERSON', 'VIDEO_CALL', 'PHONE_CALL']::"AppointmentModality"[],
    "dailyLimit" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedTime" (
    "id" TEXT NOT NULL,
    "lawyerId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawyerAvailabilityOverride" (
    "id" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "startMinutes" INTEGER,
    "endMinutes" INTEGER,
    "durationMinutes" INTEGER,
    "bufferMinutes" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LawyerAvailabilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'CLIENT',
    "scanStatus" "DocumentScanStatus" NOT NULL DEFAULT 'PENDING',
    "checksumSha256" TEXT,
    "scanProvider" TEXT,
    "scanError" TEXT,
    "scannedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "notificationSentAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "dedupeKey" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "requestId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "introduction" TEXT,
    "conclusion" TEXT,
    "references" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "legalNotice" TEXT,
    "authorId" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "practiceAreaId" TEXT,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "readingMinutes" INTEGER NOT NULL DEFAULT 5,
    "image" TEXT,
    "heroMediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCoauthor" (
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleCoauthor_pkey" PRIMARY KEY ("articleId","userId")
);

-- CreateTable
CREATE TABLE "ArticleRevision" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "changeSummary" TEXT,
    "reviewStatus" "ArticleStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleReview" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ArticleReviewDecision" NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleBlock" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "type" "ArticleBlockType" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "collection" TEXT NOT NULL DEFAULT 'General',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "public" BOOLEAN NOT NULL DEFAULT false,
    "embedUrl" TEXT,
    "status" "MediaStatus" NOT NULL DEFAULT 'PROCESSING',
    "storageKey" TEXT NOT NULL,
    "deliveryUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "altText" TEXT NOT NULL,
    "caption" TEXT,
    "checksum" TEXT NOT NULL,
    "variants" JSONB,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "company" TEXT,
    "practiceArea" TEXT,
    "message" TEXT NOT NULL,
    "privacyAcceptedAt" TIMESTAMP(3) NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "lastSentAt" TIMESTAMP(3),

    CONSTRAINT "ActionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "payload" JSONB,
    "encryptedPayload" TEXT,
    "idempotencyKey" TEXT,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerId" TEXT,
    "lastError" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "firmName" TEXT NOT NULL DEFAULT 'Lizárraga & Ibarra Abogados',
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "contactEnabled" BOOLEAN NOT NULL DEFAULT true,
    "legalName" TEXT NOT NULL DEFAULT '',
    "privacyNotice" TEXT NOT NULL DEFAULT '',
    "termsContent" TEXT NOT NULL DEFAULT '',
    "legalContentStatus" TEXT NOT NULL DEFAULT 'PENDING_REAL_CONTENT',
    "domain" TEXT NOT NULL DEFAULT 'https://lizarragaibarra.com',
    "phoneDisplay" TEXT NOT NULL DEFAULT '669 212 2543',
    "phoneE164" TEXT NOT NULL DEFAULT '+526692122543',
    "whatsappNumber" TEXT NOT NULL DEFAULT '526692122543',
    "whatsappMessage" TEXT NOT NULL DEFAULT 'Hola, me gustaría recibir información sobre los servicios de LIZÁRRAGA & IBARRA ABOGADOS.',
    "contactEmail" TEXT NOT NULL DEFAULT 'r.lizarraga@lizarragaibarra.com',
    "address" TEXT NOT NULL DEFAULT '',
    "officeHours" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "socialLinks" JSONB,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStudy" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "practiceArea" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "coverImageId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "CaseStudyVisibility" NOT NULL DEFAULT 'INTERNAL',
    "status" "CaseStudyStatus" NOT NULL DEFAULT 'DRAFT',
    "confidentialityReviewedAt" TIMESTAMP(3),
    "confidentialityReviewedBy" TEXT,
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MfaRecoveryCode_codeHash_key" ON "MfaRecoveryCode"("codeHash");

-- CreateIndex
CREATE INDEX "MfaRecoveryCode_userId_usedAt_idx" ON "MfaRecoveryCode"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "UserSession_userId_revokedAt_lastSeenAt_idx" ON "UserSession"("userId", "revokedAt", "lastSeenAt");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

-- CreateIndex
CREATE INDEX "ClientProfile_company_idx" ON "ClientProfile"("company");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeArea_slug_key" ON "PracticeArea"("slug");

-- CreateIndex
CREATE INDEX "PracticeArea_active_sortOrder_idx" ON "PracticeArea"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "LawyerProfile_userId_key" ON "LawyerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LawyerProfile_slug_key" ON "LawyerProfile"("slug");

-- CreateIndex
CREATE INDEX "LawyerProfile_active_rank_sortOrder_idx" ON "LawyerProfile"("active", "rank", "sortOrder");

-- CreateIndex
CREATE INDEX "LawyerProfile_supervisorId_idx" ON "LawyerProfile"("supervisorId");

-- CreateIndex
CREATE INDEX "LawyerPracticeArea_practiceAreaId_isPrimary_idx" ON "LawyerPracticeArea"("practiceAreaId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "Matter_reference_key" ON "Matter"("reference");

-- CreateIndex
CREATE INDEX "Matter_clientId_status_updatedAt_idx" ON "Matter"("clientId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Matter_stage_status_idx" ON "Matter"("stage", "status");

-- CreateIndex
CREATE INDEX "Matter_nextActionAt_idx" ON "Matter"("nextActionAt");

-- CreateIndex
CREATE INDEX "Matter_practiceAreaId_priority_idx" ON "Matter"("practiceAreaId", "priority");

-- CreateIndex
CREATE INDEX "MatterAssignment_lawyerId_role_idx" ON "MatterAssignment"("lawyerId", "role");

-- CreateIndex
CREATE INDEX "MatterUpdate_matterId_visibility_createdAt_idx" ON "MatterUpdate"("matterId", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "MatterUpdate_createdById_createdAt_idx" ON "MatterUpdate"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "MatterStageHistory_matterId_visibility_createdAt_idx" ON "MatterStageHistory"("matterId", "visibility", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_reference_key" ON "Appointment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_manageTokenHash_key" ON "Appointment"("manageTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_icsUid_key" ON "Appointment"("icsUid");

-- CreateIndex
CREATE INDEX "Appointment_lawyerId_startAt_status_idx" ON "Appointment"("lawyerId", "startAt", "status");

-- CreateIndex
CREATE INDEX "Appointment_clientId_startAt_idx" ON "Appointment"("clientId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_matterId_startAt_idx" ON "Appointment"("matterId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_status_startAt_idx" ON "Appointment"("status", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_calendarSyncStatus_calendarSyncLockedAt_updated_idx" ON "Appointment"("calendarSyncStatus", "calendarSyncLockedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "Appointment_email_createdAt_idx" ON "Appointment"("email", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_manageTokenExpiresAt_idx" ON "Appointment"("manageTokenExpiresAt");

-- CreateIndex
CREATE INDEX "AppointmentProposal_appointmentId_status_createdAt_idx" ON "AppointmentProposal"("appointmentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AppointmentProposal_proposedById_createdAt_idx" ON "AppointmentProposal"("proposedById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentHold_proposalId_key" ON "AppointmentHold"("proposalId");

-- CreateIndex
CREATE INDEX "AppointmentHold_expiresAt_status_idx" ON "AppointmentHold"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "AppointmentHold_appointmentId_status_idx" ON "AppointmentHold"("appointmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentHold_resourceKey_startsAt_key" ON "AppointmentHold"("resourceKey", "startsAt");

-- CreateIndex
CREATE INDEX "AppointmentReservationSlot_appointmentId_idx" ON "AppointmentReservationSlot"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentReservationSlot_startsAt_idx" ON "AppointmentReservationSlot"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentReservationSlot_resourceKey_startsAt_key" ON "AppointmentReservationSlot"("resourceKey", "startsAt");

-- CreateIndex
CREATE INDEX "AppointmentChangeRequest_appointmentId_status_createdAt_idx" ON "AppointmentChangeRequest"("appointmentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AvailabilityRule_lawyerId_weekday_active_idx" ON "AvailabilityRule"("lawyerId", "weekday", "active");

-- CreateIndex
CREATE INDEX "BlockedTime_lawyerId_startsAt_endsAt_idx" ON "BlockedTime"("lawyerId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "LawyerAvailabilityOverride_date_available_idx" ON "LawyerAvailabilityOverride"("date", "available");

-- CreateIndex
CREATE UNIQUE INDEX "LawyerAvailabilityOverride_lawyerId_date_key" ON "LawyerAvailabilityOverride"("lawyerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_matterId_visibility_createdAt_idx" ON "Document"("matterId", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "Document_scanStatus_createdAt_idx" ON "Document"("scanStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Document_deletedAt_idx" ON "Document"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_idempotencyKey_key" ON "Message"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Message_matterId_visibility_createdAt_idx" ON "Message"("matterId", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_practiceAreaId_status_publishedAt_idx" ON "Article"("practiceAreaId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "ArticleCoauthor_userId_sortOrder_idx" ON "ArticleCoauthor"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "ArticleRevision_createdById_createdAt_idx" ON "ArticleRevision"("createdById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleRevision_articleId_version_key" ON "ArticleRevision"("articleId", "version");

-- CreateIndex
CREATE INDEX "ArticleReview_articleId_createdAt_idx" ON "ArticleReview"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleReview_reviewerId_decision_createdAt_idx" ON "ArticleReview"("reviewerId", "decision", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleBlock_createdById_updatedAt_idx" ON "ArticleBlock"("createdById", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleBlock_articleId_sortOrder_key" ON "ArticleBlock"("articleId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_type_status_createdAt_idx" ON "MediaAsset"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedById_createdAt_idx" ON "MediaAsset"("uploadedById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactSubmission_reference_key" ON "ContactSubmission"("reference");

-- CreateIndex
CREATE INDEX "ContactSubmission_status_createdAt_idx" ON "ContactSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_email_createdAt_idx" ON "ContactSubmission"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActionToken_tokenHash_key" ON "ActionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ActionToken_email_type_expiresAt_idx" ON "ActionToken"("email", "type", "expiresAt");

-- CreateIndex
CREATE INDEX "ActionToken_userId_type_expiresAt_idx" ON "ActionToken"("userId", "type", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_idempotencyKey_key" ON "EmailOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailOutbox_status_nextAttemptAt_createdAt_idx" ON "EmailOutbox"("status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "EmailOutbox_recipient_createdAt_idx" ON "EmailOutbox"("recipient", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_scope_keyHash_windowStart_key" ON "RateLimitBucket"("scope", "keyHash", "windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "CaseStudy_slug_key" ON "CaseStudy"("slug");

-- CreateIndex
CREATE INDEX "CaseStudy_status_visibility_publishedAt_idx" ON "CaseStudy"("status", "visibility", "publishedAt");

-- AddForeignKey
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawyerProfile" ADD CONSTRAINT "LawyerProfile_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawyerProfile" ADD CONSTRAINT "LawyerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawyerProfile" ADD CONSTRAINT "LawyerProfile_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "LawyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawyerPracticeArea" ADD CONSTRAINT "LawyerPracticeArea_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "LawyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawyerPracticeArea" ADD CONSTRAINT "LawyerPracticeArea_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterAssignment" ADD CONSTRAINT "MatterAssignment_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterAssignment" ADD CONSTRAINT "MatterAssignment_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "LawyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterUpdate" ADD CONSTRAINT "MatterUpdate_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterUpdate" ADD CONSTRAINT "MatterUpdate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterUpdate" ADD CONSTRAINT "MatterUpdate_emailOutboxId_fkey" FOREIGN KEY ("emailOutboxId") REFERENCES "EmailOutbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterStageHistory" ADD CONSTRAINT "MatterStageHistory_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterStageHistory" ADD CONSTRAINT "MatterStageHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "LawyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_lastActorId_fkey" FOREIGN KEY ("lastActorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentProposal" ADD CONSTRAINT "AppointmentProposal_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentProposal" ADD CONSTRAINT "AppointmentProposal_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentProposal" ADD CONSTRAINT "AppointmentProposal_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "LawyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentHold" ADD CONSTRAINT "AppointmentHold_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentHold" ADD CONSTRAINT "AppointmentHold_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "AppointmentProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentHold" ADD CONSTRAINT "AppointmentHold_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "LawyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentReservationSlot" ADD CONSTRAINT "AppointmentReservationSlot_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentChangeRequest" ADD CONSTRAINT "AppointmentChangeRequest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "LawyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedTime" ADD CONSTRAINT "BlockedTime_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "LawyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawyerAvailabilityOverride" ADD CONSTRAINT "LawyerAvailabilityOverride_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "LawyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_heroMediaId_fkey" FOREIGN KEY ("heroMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCoauthor" ADD CONSTRAINT "ArticleCoauthor_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCoauthor" ADD CONSTRAINT "ArticleCoauthor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleRevision" ADD CONSTRAINT "ArticleRevision_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleRevision" ADD CONSTRAINT "ArticleRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleReview" ADD CONSTRAINT "ArticleReview_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleReview" ADD CONSTRAINT "ArticleReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleBlock" ADD CONSTRAINT "ArticleBlock_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleBlock" ADD CONSTRAINT "ArticleBlock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionToken" ADD CONSTRAINT "ActionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionToken" ADD CONSTRAINT "ActionToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStudy" ADD CONSTRAINT "CaseStudy_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

